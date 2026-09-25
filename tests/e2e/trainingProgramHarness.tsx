/**
 * Maintainer note: deterministic Program browser fixture.
 * Services are injected intentionally so responsive/interaction tests do not
 * depend on hosted auth or mutable Supabase data. Hosted RPC/schema proof belongs
 * in the database validation path, not this fixture.
 */

import { createRoot } from 'react-dom/client';
import type { TrainingProgramDefinition } from '../../src/domain/trainingProgram';
import type { TrainingProgramGeneratorCandidate } from '../../src/domain/trainingProgramGenerator';
import type { MuscleVolumeSummary } from '../../src/features/progress/model';
import type { OnboardingProfile } from '../../src/features/onboarding';
import {
  TrainingProgramController,
  type TrainingProgramControllerServices,
} from '../../src/features/training-program/components/TrainingProgramController';
import type {
  PersistedTrainingProgram,
  PersistedTrainingProgramWorkout,
} from '../../src/features/training-program/trainingProgramPersistenceService';
import type { TrainingProgramSummary } from '../../src/features/training-program/trainingProgramProductService';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: 'program-e2e-user',
  username: 'program_e2e',
  displayName: 'Program Tester',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 3,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-09-01T12:00:00.000Z',
  preferredWeightUnit: 'KG',
};

const benchCandidate: TrainingProgramGeneratorCandidate = {
  exerciseId: 'bench-press-fixture',
  canonicalName: 'Bench Press',
  measurementType: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  workoutType: 'BARBELL',
  supportsAddedWeight: false,
  supportsAssisted: false,
  volumeEligible: true,
  contributions: [{ muscleGroup: 'CHEST', role: 'DIRECT', weight: 1 }],
};

const chestVolume: MuscleVolumeSummary = {
  muscleGroup: 'CHEST',
  windowDays: 7,
  windowStart: '2026-09-18',
  windowEnd: '2026-09-24',
  methodologyVersion: 'muscle-volume-v2',
  effectiveSets: 10,
  directEffectiveSets: 10,
  indirectEffectiveSets: 0,
  eligibleLogicalSets: 10,
  eligibleStages: 10,
  reviewFlaggedLogicalSets: 0,
  targetMin: 8,
  targetMidpoint: 10,
  targetMax: 12,
  highReviewAbove: 14,
  volumeStatus: 'ON_TARGET',
  benchmarkEvidenceConfidence: 'HIGH',
  highConfidenceEffectiveSets: 10,
  mediumConfidenceEffectiveSets: 0,
  lowOrProvisionalEffectiveSets: 0,
  provisionalEffectiveSets: 0,
  highConfidenceProportion: 1,
  mediumConfidenceProportion: 0,
  lowOrProvisionalProportion: 0,
};

function generatedProgram(): TrainingProgramDefinition {
  return {
    version: 'training-program-v1',
    goal: 'BALANCED',
    weeks: 4,
    sessionsPerWeek: 1,
    source: {
      generatorVersion: 'training-program-v1',
      generatedAt: '2026-09-24T23:30:00.000Z',
      historyThroughDate: '2026-09-24',
      muscleVolumeMethodologyVersion: 'muscle-volume-v2',
      profileRevision: 1,
      constraintRevision: 0,
      durationWeeks: 4,
      startDate: '2026-09-28',
      trainingDays: ['MONDAY'],
      requestedSplit: 'AUTO',
      resolvedSplit: 'FULL_BODY',
    },
    workouts: [
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ].map((scheduledDate, weekIndex) => ({
      weekIndex,
      sessionIndex: 0,
      scheduledDate,
      title: 'Full Body',
      exercises: [{
        exerciseId: benchCandidate.exerciseId,
        canonicalName: benchCandidate.canonicalName,
        targetMuscleGroup: 'CHEST',
        targetContributionRole: 'DIRECT',
        selectionIntent: 'COMPOUND',
        measurementType: 'WEIGHT_REPS',
        orderIndex: 0,
        workingSets: 3,
        repsMin: 6,
        repsMax: 8,
        targetWeightKg: 90,
        bodyweightMode: null,
        supersetGroupIndex: null,
        supersetOrder: null,
      }],
    })),
  };
}

let persisted: PersistedTrainingProgram | null = null;
let status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' = 'DRAFT';
let programRevision = 1;

function summaryFor(program: PersistedTrainingProgram): TrainingProgramSummary {
  return {
    id: program.id,
    status,
    goal: program.definition.goal,
    durationWeeks: program.definition.weeks,
    sessionsPerWeek: program.definition.sessionsPerWeek,
    startDate: program.definition.source.startDate,
    endDate: program.workouts.at(-1)?.scheduledDate ?? program.definition.source.startDate,
    requestedSplit: program.definition.source.requestedSplit,
    resolvedSplit: program.definition.source.resolvedSplit,
    revision: programRevision,
    createdAt: '2026-09-24T23:30:00.000Z',
    updatedAt: '2026-09-24T23:30:00.000Z',
  };
}

function cloneProgram(): PersistedTrainingProgram {
  if (!persisted) throw new Error('Program fixture has not been created.');
  return structuredClone({ ...persisted, status, revision: programRevision });
}

function persistedFromDefinition(definition: TrainingProgramDefinition): PersistedTrainingProgram {
  const workouts: PersistedTrainingProgramWorkout[] = definition.workouts.map((workout, index) => ({
    ...structuredClone(workout),
    id: `program-workout-${index + 1}`,
    executionStatus: 'PLANNED',
    workoutSessionId: null,
    revision: 0,
    recommendedTotalWorkingSets: workout.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0),
    hasUserVolumeOverride: false,
  }));

  return {
    id: 'program-e2e-1',
    status,
    revision: programRevision,
    definition: structuredClone(definition),
    workouts,
  };
}

const services: TrainingProgramControllerServices = {
  profile: {
    load: async () => ({
      userId: profile.id,
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      goal: 'BALANCED',
      sessionsPerWeek: 1,
      revision: 1,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    }),
    updatePreferences: async (input) => ({
      userId: profile.id,
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      goal: input.goal,
      sessionsPerWeek: input.sessionsPerWeek,
      revision: input.expectedRevision + 1,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-24T23:30:00.000Z',
    }),
  },
  constraints: {
    load: async () => ({ revision: 0, entries: [] }),
    replace: async (input) => ({
      revision: input.expectedRevision + 1,
      entries: [...input.entries],
    }),
  },
  candidates: {
    load: async () => [benchCandidate],
  },
  progress: {
    listOverview: async () => [],
    loadCalendarSummaries: async () => [],
    loadHistory: async () => [],
    loadMuscleVolume: async () => [chestVolume],
  },
  performance: {
    loadObservations: async () => [],
  },
  personalVolume: {
    load: async () => [],
  },
  generator: {
    generate: async () => generatedProgram(),
  },
  adaptation: {
    adapt: async () => ({
      adaptationId: 'adaptation-e2e',
      outcome: 'NO_CHANGE',
      sourceProgramRevision: programRevision,
      resultingProgramRevision: programRevision,
      changeCount: 0,
      alreadyApplied: false,
    }),
  },
  product: {
    list: async () => persisted ? [summaryFor(cloneProgram())] : [],
    load: async () => cloneProgram(),
    create: async (definition) => {
      status = 'DRAFT';
      programRevision = 1;
      persisted = persistedFromDefinition(definition);
      return persisted.id;
    },
    setStatus: async (_programId, nextStatus, expectedRevision) => {
      if (expectedRevision !== programRevision) {
        throw new Error('Fixture revision mismatch.');
      }
      status = nextStatus;
      programRevision += 1;
      if (persisted) {
        persisted.status = status;
        persisted.revision = programRevision;
      }
      return {
        programId: 'program-e2e-1',
        status,
        revision: programRevision,
      };
    },
    launchProgrammedWorkout: async (programWorkoutId) => ({
      workoutSessionId: 'session-e2e',
      programWorkoutId,
      programExecutionStatus: 'STARTED_PROGRAMMED',
    }),
    launchOwnWorkout: async (programWorkoutId) => ({
      workoutSessionId: 'session-own-e2e',
      programWorkoutId,
      programExecutionStatus: 'STARTED_OWN_WORKOUT',
    }),
    markMissed: async (programWorkoutId) => {
      if (!persisted) return;
      const workout = persisted.workouts.find((item) => item.id === programWorkoutId);
      if (workout) {
        workout.executionStatus = 'MISSED';
        workout.revision += 1;
      }
    },
    replaceExercise: async () => {
      throw new Error('The E2E fixture intentionally has no compatible substitute.');
    },
    updateWorkoutVolume: async (input) => {
      if (!persisted) throw new Error('Program fixture has not been created.');
      if (input.expectedProgramRevision !== programRevision) {
        throw new Error('Fixture program revision mismatch.');
      }
      const workout = persisted.workouts.find((item) => item.id === input.programWorkoutId);
      if (!workout) throw new Error('Fixture workout not found.');
      if (workout.revision !== input.expectedWorkoutRevision) {
        throw new Error('Fixture workout revision mismatch.');
      }

      const before = workout.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0);
      const recommended = workout.recommendedTotalWorkingSets
        ?? workout.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0);

      if (input.restoreRecommended) {
        for (const exercise of workout.exercises) exercise.workingSets = 3;
        workout.hasUserVolumeOverride = false;
      } else {
        for (const override of input.overrides ?? []) {
          const exercise = workout.exercises.find((item) => item.exerciseId === override.exerciseId);
          if (exercise) exercise.workingSets = override.workingSets;
        }
        workout.hasUserVolumeOverride = workout.exercises.reduce(
          (sum, exercise) => sum + exercise.workingSets,
          0,
        ) !== recommended;
      }

      workout.revision += 1;
      programRevision += 1;
      persisted.revision = programRevision;
      const after = workout.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0);

      return {
        programId: persisted.id,
        programWorkoutId: workout.id,
        programRevision,
        workoutRevision: workout.revision,
        beforeTotalWorkingSets: before,
        afterTotalWorkingSets: after,
        changed: before !== after,
      };
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <TrainingProgramController
    onNavigate={() => undefined}
    onSignOut={() => undefined}
    profile={profile}
    services={services}
  />,
);
