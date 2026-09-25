/**
 * Maintainer boundary: durable Program read/write mapping.
 * working_sets is the system recommendation baseline. A nullable
 * user_working_sets_override is separate user intent and must not overwrite the
 * recommendation when mapping persisted exercises.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isValidTrainingProgramDefinition,
  validateTrainingProgramDefinition,
  type TrainingProgramDefinition,
  type TrainingProgramExercisePrescription,
  type TrainingProgramExecutionStatus,
  type TrainingProgramStatus,
  type TrainingProgramWorkoutTemplate,
} from '../../domain/trainingProgram';
import { getSupabaseClient } from '../../lib/supabase';

export interface PersistedTrainingProgramWorkout
  extends TrainingProgramWorkoutTemplate {
  id: string;
  executionStatus: TrainingProgramExecutionStatus;
  workoutSessionId: string | null;
  revision: number;
  recommendedTotalWorkingSets?: number;
  hasUserVolumeOverride?: boolean;
}

export interface PersistedTrainingProgram {
  id: string;
  status: TrainingProgramStatus;
  revision: number;
  definition: TrainingProgramDefinition;
  workouts: PersistedTrainingProgramWorkout[];
}

export interface TrainingProgramLifecycleResult {
  programId: string;
  status: TrainingProgramStatus;
  revision: number;
}

export interface TrainingProgramLaunchResult {
  workoutSessionId: string;
  programWorkoutId: string;
  programExecutionStatus: TrainingProgramExecutionStatus;
}

export interface TrainingProgramPersistenceService {
  create(program: TrainingProgramDefinition): Promise<string>;
  load(programId: string): Promise<PersistedTrainingProgram>;
  setStatus(
    programId: string,
    status: Exclude<TrainingProgramStatus, 'DRAFT'>,
    expectedRevision: number,
  ): Promise<TrainingProgramLifecycleResult>;
  launchProgrammedWorkout(
    programWorkoutId: string,
    actionAt?: string | null,
  ): Promise<TrainingProgramLaunchResult>;
  linkOwnWorkout(
    programWorkoutId: string,
    workoutSessionId: string,
  ): Promise<TrainingProgramLaunchResult>;
  markMissed(programWorkoutId: string): Promise<void>;
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

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function integer(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} returned an invalid integer.`);
  }
  return parsed;
}

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Training program returned an invalid numeric value.');
  }
  return parsed;
}

function executionStatus(value: unknown): TrainingProgramExecutionStatus {
  if (
    value === 'PLANNED'
    || value === 'STARTED_PROGRAMMED'
    || value === 'STARTED_OWN_WORKOUT'
    || value === 'COMPLETED_PROGRAMMED'
    || value === 'COMPLETED_OWN_WORKOUT'
    || value === 'MISSED'
  ) {
    return value;
  }
  throw new Error('Training program returned an invalid execution status.');
}

function programStatus(value: unknown): TrainingProgramStatus {
  if (
    value === 'DRAFT'
    || value === 'ACTIVE'
    || value === 'COMPLETED'
    || value === 'ARCHIVED'
  ) {
    return value;
  }
  throw new Error('Training program returned an invalid status.');
}

function mapExercise(rowValue: unknown): TrainingProgramExercisePrescription {
  const row = object(rowValue, 'Training program exercise');

  return {
    exerciseId: text(row.exercise_id, 'Training program exercise id'),
    canonicalName: text(row.canonical_name, 'Training program exercise name'),
    targetMuscleGroup: text(
      row.target_muscle_group,
      'Training program target muscle',
    ) as TrainingProgramExercisePrescription['targetMuscleGroup'],
    targetContributionRole: text(
      row.target_contribution_role,
      'Training program contribution role',
    ) as TrainingProgramExercisePrescription['targetContributionRole'],
    selectionIntent: text(
      row.selection_intent,
      'Training program selection intent',
    ) as TrainingProgramExercisePrescription['selectionIntent'],
    measurementType: text(
      row.measurement_type,
      'Training program measurement type',
    ) as TrainingProgramExercisePrescription['measurementType'],
    orderIndex: integer(row.order_index, 'Training program exercise order'),
    workingSets: integer(
      row.user_working_sets_override ?? row.working_sets,
      'Training program working sets',
    ),
    repsMin: integer(row.reps_min, 'Training program minimum reps'),
    repsMax: integer(row.reps_max, 'Training program maximum reps'),
    targetWeightKg: numericOrNull(row.target_weight_kg),
    bodyweightMode: nullableText(
      row.bodyweight_mode,
    ) as TrainingProgramExercisePrescription['bodyweightMode'],
    supersetGroupIndex:
      row.superset_group_index === null
        ? null
        : integer(row.superset_group_index, 'Training program Superset group'),
    supersetOrder:
      row.superset_order === null
        ? null
        : integer(row.superset_order, 'Training program Superset order'),
  };
}

function mapLifecycle(value: unknown): TrainingProgramLifecycleResult {
  const row = object(value, 'Training program lifecycle');
  return {
    programId: text(row.programId, 'Training program id'),
    status: programStatus(row.status),
    revision: integer(row.revision, 'Training program revision'),
  };
}

function mapLaunch(value: unknown): TrainingProgramLaunchResult {
  const row = object(value, 'Training program launch');
  return {
    workoutSessionId: text(row.id ?? row.workoutSessionId, 'Workout session id'),
    programWorkoutId: text(row.programWorkoutId, 'Program workout id'),
    programExecutionStatus: executionStatus(row.programExecutionStatus),
  };
}

export function createTrainingProgramPersistenceService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramPersistenceService {
  return {
    async create(program) {
      const issues = validateTrainingProgramDefinition(program);
      if (issues.length > 0) {
        throw new Error(
          `Cannot persist an invalid training program: ${issues
            .map((issue) => issue.code)
            .join(', ')}`,
        );
      }

      const result = await client.rpc('create_my_training_program', {
        p_program: program,
      });

      if (result.error) throw result.error;
      return text(result.data, 'Persisted training program id');
    },

    async load(programId) {
      const programResult = await client
        .from('training_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programResult.error) throw programResult.error;
      const programRow = object(
        programResult.data,
        'Persisted training program',
      );

      const workoutsResult = await client
        .from('training_program_workouts')
        .select('*')
        .eq('program_id', programId)
        .order('week_index')
        .order('session_index');

      if (workoutsResult.error) throw workoutsResult.error;
      const workoutRows = Array.isArray(workoutsResult.data)
        ? workoutsResult.data.map((row) => object(row, 'Program workout'))
        : [];

      const workoutIds = workoutRows.map((row) =>
        text(row.id, 'Program workout id')
      );

      let exerciseRows: RecordValue[] = [];
      if (workoutIds.length > 0) {
        const exerciseResult = await client
          .from('training_program_exercises')
          .select('*')
          .in('program_workout_id', workoutIds)
          .order('order_index');

        if (exerciseResult.error) throw exerciseResult.error;
        exerciseRows = Array.isArray(exerciseResult.data)
          ? exerciseResult.data.map((row) =>
            object(row, 'Program exercise')
          )
          : [];
      }

      const exercisesByWorkout = new Map<string, TrainingProgramExercisePrescription[]>();
      const recommendedSetsByWorkout = new Map<string, number>();
      const volumeOverrideByWorkout = new Map<string, boolean>();

      for (const exerciseRow of exerciseRows) {
        const workoutId = text(
          exerciseRow.program_workout_id,
          'Program workout exercise parent',
        );
        const items = exercisesByWorkout.get(workoutId) ?? [];
        items.push(mapExercise(exerciseRow));
        exercisesByWorkout.set(workoutId, items);

        recommendedSetsByWorkout.set(
          workoutId,
          (recommendedSetsByWorkout.get(workoutId) ?? 0)
            + integer(
              exerciseRow.working_sets,
              'Recommended training program working sets',
            ),
        );

        if (
          exerciseRow.user_working_sets_override !== null
          && exerciseRow.user_working_sets_override !== undefined
        ) {
          volumeOverrideByWorkout.set(workoutId, true);
        }
      }

      const persistedWorkouts: PersistedTrainingProgramWorkout[] =
        workoutRows.map((row) => {
          const id = text(row.id, 'Program workout id');
          return {
            id,
            weekIndex: integer(row.week_index, 'Program week index'),
            sessionIndex: integer(row.session_index, 'Program session index'),
            scheduledDate: text(
              row.scheduled_date,
              'Program scheduled date',
            ),
            title: text(row.title, 'Program workout title'),
            exercises: (exercisesByWorkout.get(id) ?? [])
              .sort((left, right) => left.orderIndex - right.orderIndex),
            executionStatus: executionStatus(row.execution_status),
            workoutSessionId: nullableText(row.workout_session_id),
            revision: integer(row.revision, 'Program workout revision'),
            recommendedTotalWorkingSets:
              recommendedSetsByWorkout.get(id) ?? 0,
            hasUserVolumeOverride:
              volumeOverrideByWorkout.get(id) ?? false,
          };
        });

      const source = object(
        programRow.source_snapshot,
        'Training program source snapshot',
      ) as unknown as TrainingProgramDefinition['source'];

      const definition: TrainingProgramDefinition = {
        version: text(
          programRow.version,
          'Training program version',
        ) as TrainingProgramDefinition['version'],
        goal: text(
          programRow.goal,
          'Training program goal',
        ) as TrainingProgramDefinition['goal'],
        weeks: integer(
          programRow.duration_weeks,
          'Training program duration',
        ) as TrainingProgramDefinition['weeks'],
        sessionsPerWeek: integer(
          programRow.sessions_per_week,
          'Training program frequency',
        ),
        source,
        workouts: persistedWorkouts.map((workout) => ({
          weekIndex: workout.weekIndex,
          sessionIndex: workout.sessionIndex,
          scheduledDate: workout.scheduledDate,
          title: workout.title,
          exercises: workout.exercises,
        })),
      };

      if (!isValidTrainingProgramDefinition(definition)) {
        throw new Error(
          'Persisted training program no longer satisfies the domain contract.',
        );
      }

      return {
        id: text(programRow.id, 'Training program id'),
        status: programStatus(programRow.status),
        revision: integer(programRow.revision, 'Training program revision'),
        definition,
        workouts: persistedWorkouts,
      };
    },

    async setStatus(programId, status, expectedRevision) {
      const result = await client.rpc('set_my_training_program_status', {
        p_program_id: programId,
        p_status: status,
        p_expected_revision: expectedRevision,
      });

      if (result.error) throw result.error;
      return mapLifecycle(result.data);
    },

    async launchProgrammedWorkout(programWorkoutId, actionAt = null) {
      const result = await client.rpc(
        'launch_my_training_program_workout',
        {
          p_program_workout_id: programWorkoutId,
          p_action_at: actionAt,
        },
      );

      if (result.error) throw result.error;
      return mapLaunch(result.data);
    },

    async linkOwnWorkout(programWorkoutId, workoutSessionId) {
      const result = await client.rpc(
        'link_my_training_program_own_workout',
        {
          p_program_workout_id: programWorkoutId,
          p_workout_session_id: workoutSessionId,
        },
      );

      if (result.error) throw result.error;
      return mapLaunch(result.data);
    },

    async markMissed(programWorkoutId) {
      const result = await client.rpc(
        'mark_my_training_program_workout_missed',
        {
          p_program_workout_id: programWorkoutId,
        },
      );

      if (result.error) throw result.error;
    },
  };
}
