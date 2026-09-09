import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  WorkoutAdvancedSetInput,
  WorkoutAdvancedSetVariant,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutSetSegment,
  WorkoutSetType,
  WorkoutSetVariant,
} from './model';

type WorkoutSetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: WorkoutSetType;
  set_variant: WorkoutSetVariant;
  weight_kg: number | string | null;
  reps: number | null;
  bodyweight_mode: WorkoutSet['bodyweightMode'];
  completed: boolean;
  completed_at: string | null;
  revision: number;
};

type WorkoutSetSegmentRow = {
  id: string;
  workout_set_id: string;
  segment_index: number;
  weight_kg: number | string | null;
  reps: number | null;
};

export interface WorkoutSetService {
  loadWorkoutSets(workoutExerciseIds: readonly string[]): Promise<WorkoutSet[]>;
  addSet(workoutExerciseId: string, setType?: WorkoutSetType): Promise<string>;
  addAdvancedSet(workoutExerciseId: string, variant: WorkoutAdvancedSetVariant): Promise<string>;
  copySet(workoutSetId: string): Promise<string>;
  saveSet(workoutSetId: string, input: WorkoutSetInput): Promise<string>;
  saveAdvancedSet(workoutSetId: string, input: WorkoutAdvancedSetInput): Promise<string>;
  removeSet(workoutSetId: string): Promise<void>;
}

function mapSegment(row: WorkoutSetSegmentRow): WorkoutSetSegment {
  return {
    id: row.id,
    workoutSetId: row.workout_set_id,
    segmentIndex: row.segment_index,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
  };
}

function mapRow(row: WorkoutSetRow, segments: WorkoutSetSegment[]): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    setType: row.set_type,
    setVariant: row.set_variant ?? (row.set_type === 'DROP' ? 'DROP' : 'STANDARD'),
    segments: [...segments].sort((left, right) => left.segmentIndex - right.segmentIndex),
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
    bodyweightMode: row.bodyweight_mode,
    completed: row.completed,
    completedAt: row.completed_at,
    revision: row.revision,
  };
}

export function createWorkoutSetService(client: SupabaseClient = getSupabaseClient()): WorkoutSetService {
  return {
    async loadWorkoutSets(workoutExerciseIds) {
      if (workoutExerciseIds.length === 0) return [];
      const result = await client
        .from('workout_sets')
        .select('id, workout_exercise_id, set_number, set_type, set_variant, weight_kg, reps, bodyweight_mode, completed, completed_at, revision')
        .in('workout_exercise_id', [...workoutExerciseIds])
        .order('set_number', { ascending: true });
      if (result.error) throw result.error;

      const rows = (result.data ?? []) as WorkoutSetRow[];
      const setIds = rows.map((row) => row.id);
      const segmentsBySetId = new Map<string, WorkoutSetSegment[]>();
      if (setIds.length > 0) {
        const segmentResult = await client
          .from('workout_set_segments')
          .select('id, workout_set_id, segment_index, weight_kg, reps')
          .in('workout_set_id', setIds)
          .order('segment_index', { ascending: true });
        if (segmentResult.error) throw segmentResult.error;

        for (const row of (segmentResult.data ?? []) as WorkoutSetSegmentRow[]) {
          const segments = segmentsBySetId.get(row.workout_set_id) ?? [];
          segments.push(mapSegment(row));
          segmentsBySetId.set(row.workout_set_id, segments);
        }
      }

      return rows
        .map((row) => mapRow(row, segmentsBySetId.get(row.id) ?? []))
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

    async addAdvancedSet(workoutExerciseId, variant) {
      const result = await client.rpc('add_lifting_workout_advanced_set', {
        p_workout_exercise_id: workoutExerciseId,
        p_variant: variant,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Advanced set add did not return a workout set id.');
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

    async saveAdvancedSet(workoutSetId, input) {
      const result = await client.rpc('save_lifting_workout_advanced_set', {
        p_workout_set_id: workoutSetId,
        p_variant: input.variant,
        p_segments: input.segments,
        p_completed: input.completed,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Advanced set save did not return a workout set id.');
      return result.data;
    },

    async removeSet(workoutSetId) {
      const result = await client.rpc('remove_lifting_workout_set', { p_workout_set_id: workoutSetId });
      if (result.error) throw result.error;
    },
  };
}
