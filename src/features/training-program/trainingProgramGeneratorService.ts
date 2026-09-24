import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  generateTrainingProgram,
  type TrainingProgramExerciseHistory,
  type TrainingProgramMuscleGroup,
  type TrainingProgramVolumeSignal,
} from '../../domain/trainingProgramGenerator';
import type { TrainingProgramDefinition } from '../../domain/trainingProgram';
import type {
  TrainingProgramDayOfWeek,
  TrainingProgramDurationWeeks,
  TrainingProgramRequestedSplit,
} from '../../domain/trainingProgramSchedule';
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
  createTrainingProgramConstraintService,
  type TrainingProgramConstraintService,
} from './trainingProgramConstraintService';
import {
  createTrainingProgramGeneratorProfileService,
  type TrainingProgramGeneratorProfileService,
} from './trainingProgramGeneratorProfileService';

export interface TrainingProgramGeneratorServiceDependencies {
  profileService: TrainingProgramGeneratorProfileService;
  candidateService: TrainingProgramCandidateService;
  constraintService: TrainingProgramConstraintService;
  progressService: ExerciseProgressService;
  performanceService: MusclePerformanceService;
}

export interface TrainingProgramGenerateRequest {
  userId: string;
  durationWeeks: TrainingProgramDurationWeeks;
  startDate: string;
  trainingDays: TrainingProgramDayOfWeek[];
  requestedSplit: TrainingProgramRequestedSplit;
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
      'LATS',
      'UPPER_BACK',
      'TRAPS',
      'SPINAL_ERECTORS',
      'ANTERIOR_DELTS',
      'LATERAL_DELTS',
      'POSTERIOR_DELTS',
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
    constraintService: injected?.constraintService
      ?? createTrainingProgramConstraintService(getClient()),
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
        constraints,
        candidates,
        progressOverview,
        volumeRows,
        performanceObservations,
      ] = await Promise.all([
        dependencies.constraintService.load(),
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
        .flatMap((payload) => {
          try {
            return [{
              muscleGroup: muscleGroup(payload.muscleGroup),
              action: payload.recommendation.action,
              suggestedEffectiveSetChange:
                payload.recommendation.suggestedEffectiveSetChange,
            }];
          } catch {
            // During the staged v1 -> v2 rollout, legacy BACK/SHOULDERS
            // recommendation rows are not valid Phase 20 granular targets.
            return [];
          }
        });

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
        ?? 'muscle-volume-v2';

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
        constraints,
        durationWeeks: request.durationWeeks,
        startDate: request.startDate,
        trainingDays: request.trainingDays,
        requestedSplit: request.requestedSplit,
        generatedAt: request.generatedAt,
        historyThroughDate: request.historyThroughDate,
        muscleVolumeMethodologyVersion: methodologyVersion,
      });
    },
  };
}
