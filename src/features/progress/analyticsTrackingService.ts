import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

type TrackedExerciseRow = {
  exercise_id: string;
};

export interface ExerciseAnalyticsTrackingService {
  listTrackedExerciseIds(): Promise<string[]>;
  setTracked(exerciseId: string, tracked: boolean): Promise<boolean>;
}

export function createExerciseAnalyticsTrackingService(
  client: SupabaseClient = getSupabaseClient(),
): ExerciseAnalyticsTrackingService {
  return {
    async listTrackedExerciseIds() {
      const { data, error } = await client
        .from('user_tracked_exercises')
        .select('exercise_id');

      if (error) throw error;

      return [...new Set(((data ?? []) as TrackedExerciseRow[]).map((row) => row.exercise_id))];
    },

    async setTracked(exerciseId, tracked) {
      const { data, error } = await client.rpc('set_my_exercise_analytics_tracking', {
        p_exercise_id: exerciseId,
        p_tracked: tracked,
      });

      if (error) throw error;
      return Boolean(data);
    },
  };
}
