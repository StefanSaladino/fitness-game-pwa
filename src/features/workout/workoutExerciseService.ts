import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { ExerciseMeasurementType, WorkoutExercise } from './model';

type LegacyWorkoutExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  revision: number;
};

type WorkoutExerciseRow = LegacyWorkoutExerciseRow & {
  superset_group_id: string | null;
  superset_order: number | null;
};

type PostgrestErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

type ExerciseCatalogRow = {
  id: string;
  canonical_name: string;
  measurement_type: ExerciseMeasurementType;
};

export interface WorkoutExerciseService {
  loadWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]>;
  addExercise(workoutId: string, exerciseId: string): Promise<string>;
  removeExercise(workoutExerciseId: string): Promise<void>;
  moveExercise(workoutExerciseId: string, newOrderIndex: number): Promise<void>;
}

function isMissingSupersetColumnError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as PostgrestErrorLike;
  if (candidate.code !== '42703' && candidate.code !== 'PGRST204') return false;

  const detail = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return detail.includes('superset_group_id') || detail.includes('superset_order');
}

async function loadWorkoutExerciseRows(client: SupabaseClient, workoutId: string): Promise<WorkoutExerciseRow[]> {
  const groupedResult = await client
    .from('workout_exercises')
    .select('id, workout_id, exercise_id, order_index, superset_group_id, superset_order, revision')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (!groupedResult.error) return (groupedResult.data ?? []) as WorkoutExerciseRow[];
  if (!isMissingSupersetColumnError(groupedResult.error)) throw groupedResult.error;

  // Phase 18.2 is shipped as a local overlay before its migration is applied to
  // production. During that narrow window, keep active lifts readable against
  // the pre-Superset schema. This fallback is intentionally limited to the two
  // missing additive columns and must not mask unrelated PostgREST failures.
  const legacyResult = await client
    .from('workout_exercises')
    .select('id, workout_id, exercise_id, order_index, revision')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (legacyResult.error) throw legacyResult.error;
  return ((legacyResult.data ?? []) as LegacyWorkoutExerciseRow[]).map((row) => ({
    ...row,
    superset_group_id: null,
    superset_order: null,
  }));
}

export function createWorkoutExerciseService(client: SupabaseClient = getSupabaseClient()): WorkoutExerciseService {
  return {
    async loadWorkoutExercises(workoutId) {
      const rows = await loadWorkoutExerciseRows(client, workoutId);
      if (rows.length === 0) return [];

      const catalogRows = await client
        .from('exercise_catalog')
        .select('id, canonical_name, measurement_type')
        .in('id', [...new Set(rows.map((row) => row.exercise_id))]);

      if (catalogRows.error) throw catalogRows.error;
      const catalog = new Map(
        ((catalogRows.data ?? []) as ExerciseCatalogRow[]).map((row): [string, ExerciseCatalogRow] => [row.id, row]),
      );

      return rows.map((row) => {
        const exercise = catalog.get(row.exercise_id);
        if (!exercise) throw new Error('A workout exercise could not be resolved from the catalog.');
        return {
          id: row.id,
          workoutId: row.workout_id,
          exerciseId: row.exercise_id,
          orderIndex: row.order_index,
          supersetGroupId: row.superset_group_id,
          supersetOrder: row.superset_order,
          revision: row.revision,
          canonicalName: exercise.canonical_name,
          measurementType: exercise.measurement_type,
        };
      });
    },

    async addExercise(workoutId, exerciseId) {
      const result = await client.rpc('add_lifting_workout_exercise', {
        p_workout_id: workoutId,
        p_exercise_id: exerciseId,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Exercise add did not return a workout exercise id.');
      return result.data;
    },

    async removeExercise(workoutExerciseId) {
      const result = await client.rpc('remove_lifting_workout_exercise', {
        p_workout_exercise_id: workoutExerciseId,
      });
      if (result.error) throw result.error;
    },

    async moveExercise(workoutExerciseId, newOrderIndex) {
      const result = await client.rpc('move_lifting_workout_exercise', {
        p_workout_exercise_id: workoutExerciseId,
        p_new_order_index: newOrderIndex,
      });
      if (result.error) throw result.error;
    },
  };
}
