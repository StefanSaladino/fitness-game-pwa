import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { ExerciseMeasurementType, WorkoutExercise } from './model';

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  revision: number;
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

export function createWorkoutExerciseService(client: SupabaseClient = getSupabaseClient()): WorkoutExerciseService {
  return {
    async loadWorkoutExercises(workoutId) {
      const exerciseRows = await client
        .from('workout_exercises')
        .select('id, workout_id, exercise_id, order_index, revision')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (exerciseRows.error) throw exerciseRows.error;
      const rows = (exerciseRows.data ?? []) as WorkoutExerciseRow[];
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
