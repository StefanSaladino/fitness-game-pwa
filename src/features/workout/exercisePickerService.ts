import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { ExerciseMeasurementType, ExerciseMuscleGroup, ExercisePickerItem, ExerciseWorkoutType } from './model';

type ExercisePickerRow = {
  id: string;
  canonical_name: string;
  measurement_type: ExerciseMeasurementType;
  primary_muscle_group: ExerciseMuscleGroup;
  workout_type: ExerciseWorkoutType;
  aliases: string[] | null;
  last_used_at: string | null;
};

export interface ExercisePickerService {
  loadCatalog(): Promise<ExercisePickerItem[]>;
}

export function createExercisePickerService(client: SupabaseClient = getSupabaseClient()): ExercisePickerService {
  return {
    async loadCatalog() {
      const result = await client.rpc('get_exercise_picker_catalog');
      if (result.error) throw result.error;
      return ((result.data ?? []) as ExercisePickerRow[]).map((row) => ({
        id: row.id,
        canonicalName: row.canonical_name,
        measurementType: row.measurement_type,
        primaryMuscleGroup: row.primary_muscle_group,
        workoutType: row.workout_type,
        aliases: row.aliases ?? [],
        lastUsedAt: row.last_used_at,
      }));
    },
  };
}
