/**
 * Maintainer boundary: Program UI orchestration over persistence/mutation RPCs.
 * Launch must enter the ordinary workout engine; never grow a second set-logging
 * lifecycle inside the Program feature.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TrainingProgramDefinition,
  TrainingProgramStatus,
} from '../../domain/trainingProgram';
import { getSupabaseClient } from '../../lib/supabase';
import {
  createTrainingProgramPersistenceService,
  type PersistedTrainingProgram,
  type TrainingProgramLaunchResult,
  type TrainingProgramLifecycleResult,
} from './trainingProgramPersistenceService';

export interface TrainingProgramSummary {
  id: string;
  status: TrainingProgramStatus;
  goal: 'STRENGTH' | 'HYPERTROPHY' | 'BALANCED';
  durationWeeks: 4 | 8;
  sessionsPerWeek: number;
  startDate: string;
  endDate: string;
  requestedSplit: string;
  resolvedSplit: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgramReplacementInput {
  programExerciseId: string;
  replacementExerciseId: string;
  expectedProgramRevision: number;
  expectedConstraintRevision: number;
  targetWeightKg: number | null;
}

export interface TrainingProgramReplacementResult {
  substitutionId: string;
  programId: string;
  programWorkoutId: string;
  programExerciseId: string;
  replacementExerciseId: string;
  replacementCanonicalName: string;
  programRevision: number;
  workoutRevision: number;
  constraintRevision: number;
}

export interface TrainingProgramVolumeOverrideInput {
  exerciseId: string;
  workingSets: number;
}

export interface TrainingProgramVolumeMutationInput {
  programWorkoutId: string;
  expectedProgramRevision: number;
  expectedWorkoutRevision: number;
  overrides?: readonly TrainingProgramVolumeOverrideInput[];
  restoreRecommended?: boolean;
}

export interface TrainingProgramVolumeMutationResult {
  programId: string;
  programWorkoutId: string;
  programRevision: number;
  workoutRevision: number;
  beforeTotalWorkingSets: number;
  afterTotalWorkingSets: number;
  changed: boolean;
}

export interface TrainingProgramProductService {
  list(): Promise<TrainingProgramSummary[]>;
  load(programId: string): Promise<PersistedTrainingProgram>;
  create(program: TrainingProgramDefinition): Promise<string>;
  setStatus(
    programId: string,
    status: Exclude<TrainingProgramStatus, 'DRAFT'>,
    expectedRevision: number,
  ): Promise<TrainingProgramLifecycleResult>;
  launchProgrammedWorkout(
    programWorkoutId: string,
    actionAt?: string | null,
  ): Promise<TrainingProgramLaunchResult>;
  launchOwnWorkout(
    programWorkoutId: string,
    actionAt?: string | null,
  ): Promise<TrainingProgramLaunchResult>;
  markMissed(programWorkoutId: string): Promise<void>;
  replaceExercise(
    input: TrainingProgramReplacementInput,
  ): Promise<TrainingProgramReplacementResult>;
  updateWorkoutVolume(
    input: TrainingProgramVolumeMutationInput,
  ): Promise<TrainingProgramVolumeMutationResult>;
}

type RecordValue = Record<string, unknown>;

function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid object.`);
  }
  return value as RecordValue;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} returned an invalid string.`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} returned an invalid integer.`);
  }
  return parsed;
}

function status(value: unknown): TrainingProgramStatus {
  if (
    value === 'DRAFT'
    || value === 'ACTIVE'
    || value === 'COMPLETED'
    || value === 'ARCHIVED'
  ) return value;
  throw new Error('Training program returned an invalid status.');
}

function goal(value: unknown): TrainingProgramSummary['goal'] {
  if (
    value === 'STRENGTH'
    || value === 'HYPERTROPHY'
    || value === 'BALANCED'
  ) return value;
  throw new Error('Training program returned an invalid goal.');
}

function durationWeeks(value: unknown): 4 | 8 {
  const parsed = integer(value, 'Training program duration');
  if (parsed === 4 || parsed === 8) return parsed;
  throw new Error('Training program returned an invalid duration.');
}

function mapSummary(value: unknown): TrainingProgramSummary {
  const row = object(value, 'Training program summary');
  return {
    id: text(row.id, 'Training program id'),
    status: status(row.status),
    goal: goal(row.goal),
    durationWeeks: durationWeeks(row.duration_weeks),
    sessionsPerWeek: integer(
      row.sessions_per_week,
      'Training program frequency',
    ),
    startDate: text(row.start_date, 'Training program start date'),
    endDate: text(row.end_date, 'Training program end date'),
    requestedSplit: text(
      row.requested_split,
      'Training program requested split',
    ),
    resolvedSplit: text(
      row.resolved_split,
      'Training program resolved split',
    ),
    revision: integer(row.revision, 'Training program revision'),
    createdAt: text(row.created_at, 'Training program created timestamp'),
    updatedAt: text(row.updated_at, 'Training program updated timestamp'),
  };
}

function mapLaunch(value: unknown): TrainingProgramLaunchResult {
  const row = object(value, 'Training program launch');
  const execution = text(
    row.programExecutionStatus,
    'Training program execution status',
  );
  if (
    execution !== 'STARTED_PROGRAMMED'
    && execution !== 'STARTED_OWN_WORKOUT'
    && execution !== 'COMPLETED_PROGRAMMED'
    && execution !== 'COMPLETED_OWN_WORKOUT'
  ) {
    throw new Error('Training program launch returned an invalid status.');
  }

  return {
    workoutSessionId: text(
      row.id ?? row.workoutSessionId,
      'Workout session id',
    ),
    programWorkoutId: text(row.programWorkoutId, 'Program workout id'),
    programExecutionStatus: execution,
  };
}

function mapReplacement(value: unknown): TrainingProgramReplacementResult {
  const row = object(value, 'Training program replacement');
  return {
    substitutionId: text(row.substitutionId, 'Substitution id'),
    programId: text(row.programId, 'Program id'),
    programWorkoutId: text(row.programWorkoutId, 'Program workout id'),
    programExerciseId: text(row.programExerciseId, 'Program exercise id'),
    replacementExerciseId: text(
      row.replacementExerciseId,
      'Replacement exercise id',
    ),
    replacementCanonicalName: text(
      row.replacementCanonicalName,
      'Replacement exercise name',
    ),
    programRevision: integer(row.programRevision, 'Program revision'),
    workoutRevision: integer(row.workoutRevision, 'Workout revision'),
    constraintRevision: integer(
      row.constraintRevision,
      'Constraint revision',
    ),
  };
}

function mapVolumeMutation(
  value: unknown,
): TrainingProgramVolumeMutationResult {
  const row = object(value, 'Training program volume mutation');
  return {
    programId: text(row.programId, 'Program id'),
    programWorkoutId: text(row.programWorkoutId, 'Program workout id'),
    programRevision: integer(row.programRevision, 'Program revision'),
    workoutRevision: integer(row.workoutRevision, 'Workout revision'),
    beforeTotalWorkingSets: integer(
      row.beforeTotalWorkingSets,
      'Previous total working sets',
    ),
    afterTotalWorkingSets: integer(
      row.afterTotalWorkingSets,
      'Updated total working sets',
    ),
    changed: Boolean(row.changed),
  };
}

export function createTrainingProgramProductService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramProductService {
  const persistence = createTrainingProgramPersistenceService(client);

  return {
    async list() {
      const result = await client
        .from('training_programs')
        .select([
          'id',
          'status',
          'goal',
          'duration_weeks',
          'sessions_per_week',
          'start_date',
          'end_date',
          'requested_split',
          'resolved_split',
          'revision',
          'created_at',
          'updated_at',
        ].join(', '))
        .order('created_at', { ascending: false })
        .limit(20);

      if (result.error) throw result.error;
      return (result.data ?? []).map(mapSummary);
    },

    load: persistence.load,
    create: persistence.create,
    setStatus: persistence.setStatus,
    launchProgrammedWorkout: persistence.launchProgrammedWorkout,
    markMissed: persistence.markMissed,

    async launchOwnWorkout(programWorkoutId, actionAt = null) {
      const result = await client.rpc(
        'launch_my_training_program_own_workout',
        {
          p_program_workout_id: programWorkoutId,
          p_action_at: actionAt,
        },
      );
      if (result.error) throw result.error;
      return mapLaunch(result.data);
    },

    async replaceExercise(input) {
      const result = await client.rpc(
        'replace_my_training_program_exercise',
        {
          p_program_exercise_id: input.programExerciseId,
          p_replacement_exercise_id: input.replacementExerciseId,
          p_expected_program_revision: input.expectedProgramRevision,
          p_expected_constraint_revision: input.expectedConstraintRevision,
          p_target_weight_kg: input.targetWeightKg,
        },
      );
      if (result.error) throw result.error;
      return mapReplacement(result.data);
    },

    async updateWorkoutVolume(input) {
      const overrides = [...(input.overrides ?? [])];
      for (const override of overrides) {
        if (
          !override.exerciseId.trim()
          || !Number.isInteger(override.workingSets)
          || override.workingSets < 1
          || override.workingSets > 8
        ) {
          throw new Error(
            'Training program volume override is outside the supported set range.',
          );
        }
      }

      const result = await client.rpc(
        'set_my_training_program_workout_volume',
        {
          p_program_workout_id: input.programWorkoutId,
          p_expected_program_revision: input.expectedProgramRevision,
          p_expected_workout_revision: input.expectedWorkoutRevision,
          p_overrides: overrides,
          p_restore_recommended: Boolean(input.restoreRecommended),
        },
      );

      if (result.error) throw result.error;
      return mapVolumeMutation(result.data);
    },
  };
}
