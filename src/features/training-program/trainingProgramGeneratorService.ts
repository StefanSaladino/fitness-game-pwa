import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  generateTrainingProgram,
  type TrainingProgramExerciseHistory,
  type TrainingProgramMuscleGroup,
  type TrainingProgramVolumeSignal,
} from '../../domain/trainingProgramGenerator';
import type { TrainingProgramDefinition } from '../../domain/trainingProgram';
import {
  createExerciseProgressService,
  type ExerciseProgressService,
} from '../progress/progressService';
import {
  createMusclePerformanceService,
  type MusclePerformanceService,
} from '../progress/musclePerformanceService';
import { buildMuscleVolumeRecommendationPayloads } from '../progress/muscleVolumeRecommendationModel';
import {
  createTrainingProgramCandidateService,
  type TrainingProgramCandidateService,
} from './trainingProgramCandidateService';
import {
  createTrainingProgramGeneratorProfileService,
  type TrainingProgramGeneratorProfileService,
} from './trainingProgramGeneratorProfileService';

export interface TrainingProgramGeneratorServiceDependencies {
  profileService: TrainingProgramGeneratorProfileService;
  candidateService: TrainingProgramCandidateService;
  progressService: ExerciseProgressService;
  performanceService: MusclePerformanceService;
}

export interface TrainingProgramGenerateRequest {
  userId: string;
  generatedAt: string;
  historyThroughDate: string;
}

export interface TrainingProgramGeneratorService {
  generate(
    request: TrainingProgramGenerateRequest,
  ): Promise<TrainingProgramDefinition>;
}

function muscleGroup(value: string): TrainingProgramMuscleGroup {
  if (
    [
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'QUADS',
      'HAMSTRINGS',
      'GLUTES',
      'CALVES',
      'FOREARMS_GRIP',
      'CORE',
      'OBLIQUES',
      'NECK',
    ].includes(value)
  ) {
    return value as TrainingProgramMuscleGroup;
  }

  throw new Error(`Unexpected Phase 19 muscle group: ${value}`);
}

export function createTrainingProgramGeneratorService(
  client?: SupabaseClient,
  injected?: Partial<TrainingProgramGeneratorServiceDependencies>,
): TrainingProgramGeneratorService {
  let resolvedClient = client;

  const getClient = (): SupabaseClient => {
    resolvedClient ??= getSupabaseClient();
    return resolvedClient;
  };

  const dependencies: TrainingProgramGeneratorServiceDependencies = {
    profileService: injected?.profileService
      ?? createTrainingProgramGeneratorProfileService(getClient()),
    candidateService: injected?.candidateService
      ?? createTrainingProgramCandidateService(getClient()),
    progressService: injected?.progressService
      ?? createExerciseProgressService(getClient()),
    performanceService: injected?.performanceService
      ?? createMusclePerformanceService(getClient()),
  };

  return {
    async generate(request) {
      const profile = await dependencies.profileService.load(request.userId);

      if (!profile) {
        throw new Error(
          'Configure personalized-program equipment access first.',
        );
      }

      if (!profile.goal || !profile.sessionsPerWeek) {
        throw new Error(
          'Configure personalized-program goal and weekly frequency first.',
        );
      }

      const [
        candidates,
        progressOverview,
        volumeRows,
        performanceObservations,
      ] = await Promise.all([
        dependencies.candidateService.load(),
        dependencies.progressService.listOverview(),
        dependencies.progressService.loadMuscleVolume(
          request.historyThroughDate,
        ),
        dependencies.performanceService.loadObservations(
          request.historyThroughDate,
          56,
        ),
      ]);

      const recommendationPayloads = buildMuscleVolumeRecommendationPayloads(
        volumeRows,
        performanceObservations,
      );

      const volumeSignals: TrainingProgramVolumeSignal[] = recommendationPayloads
        .filter((payload) => payload.windowDays === 7)
        .map((payload) => ({
          muscleGroup: muscleGroup(payload.muscleGroup),
          action: payload.recommendation.action,
          suggestedEffectiveSetChange:
            payload.recommendation.suggestedEffectiveSetChange,
        }));

      const history: TrainingProgramExerciseHistory[] = progressOverview.map(
        (entry) => ({
          exerciseId: entry.exerciseId,
          metricType: entry.metricType,
          bestValue: entry.bestValue,
          referenceWeightKg: entry.bestWeightKg,
          referenceReps: entry.bestReps,
          sessionCount: entry.sessionCount,
          observationCount: entry.observationCount,
          achievedAt: entry.achievedAt,
          lastPerformedAt: entry.lastPerformedAt,
        }),
      );

      const methodologyVersion = volumeRows[0]?.methodologyVersion
        ?? 'muscle-volume-v1';

      return generateTrainingProgram({
        profile: {
          goal: profile.goal,
          sessionsPerWeek: profile.sessionsPerWeek,
          accessMode: profile.accessMode,
          equipmentKeys: profile.equipmentKeys,
          revision: profile.revision,
        },
        candidates,
        history,
        volumeSignals,
        generatedAt: request.generatedAt,
        historyThroughDate: request.historyThroughDate,
        muscleVolumeMethodologyVersion: methodologyVersion,
        constraintRevision: 0,
      });
    },
  };
}
