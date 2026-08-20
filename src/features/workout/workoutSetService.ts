import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { WorkoutSet, WorkoutSetInput, WorkoutSetType } from './model';

type WorkoutSetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: WorkoutSetType;
  weight_kg: number | string | null;
  reps: number | null;
  bodyweight_mode: WorkoutSet['bodyweightMode'];
  completed: boolean;
  completed_at: string | null;
};

export interface WorkoutSetService {
  loadWorkoutSets(workoutExerciseIds: readonly string[]): Promise<WorkoutSet[]>;
  addSet(workoutExerciseId: string, setType?: WorkoutSetType): Promise<string>;
  copySet(workoutSetId: string): Promise<string>;
  saveSet(workoutSetId: string, input: WorkoutSetInput): Promise<string>;
  removeSet(workoutSetId: string): Promise<void>;
}

function mapRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    setType: row.set_type,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
    bodyweightMode: row.bodyweight_mode,
    completed: row.completed,
    completedAt: row.completed_at,
  };
}

export function createWorkoutSetService(client: SupabaseClient = getSupabaseClient()): WorkoutSetService {
  return {
    async loadWorkoutSets(workoutExerciseIds) {
      if (workoutExerciseIds.length === 0) return [];
      const result = await client
        .from('workout_sets')
        .select('id, workout_exercise_id, set_number, set_type, weight_kg, reps, bodyweight_mode, completed, completed_at')
        .in('workout_exercise_id', [...workoutExerciseIds])
        .order('set_number', { ascending: true });
      if (result.error) throw result.error;
      return ((result.data ?? []) as WorkoutSetRow[])
        .map(mapRow)
        .sort((a, b) => a.workoutExerciseId.localeCompare(b.workoutExerciseId) || a.setNumber - b.setNumber);
    },

    async addSet(workoutExerciseId, setType = 'WORKING') {
      const result = await client.rpc('add_lifting_workout_set', {
        p_workout_exercise_id: workoutExerciseId,
        p_set_type: setType,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Set add did not return a workout set id.');
      return result.data;
    },

    async copySet(workoutSetId) {
      const result = await client.rpc('copy_lifting_workout_set', { p_workout_set_id: workoutSetId });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Set copy did not return a workout set id.');
      return result.data;
    },

    async saveSet(workoutSetId, input) {
      const result = await client.rpc('save_lifting_workout_set', {
        p_workout_set_id: workoutSetId,
        p_set_type: input.setType,
        p_weight_kg: input.weightKg,
        p_reps: input.reps,
        p_bodyweight_mode: input.bodyweightMode,
        p_completed: input.completed,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Set save did not return a workout set id.');
      return result.data;
    },

    async removeSet(workoutSetId) {
      const result = await client.rpc('remove_lifting_workout_set', { p_workout_set_id: workoutSetId });
      if (result.error) throw result.error;
    },
  };
}
