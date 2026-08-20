import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkoutMutationQueueItem } from './workoutMutationModel';

export interface WorkoutMutationService {
  apply(item: WorkoutMutationQueueItem): Promise<void>;
}

export function createWorkoutMutationService(client: SupabaseClient = getSupabaseClient()): WorkoutMutationService {
  return {
    async apply(item) {
      const result = await client.rpc('apply_lifting_workout_mutation', {
        p_idempotency_key: item.idempotencyKey,
        p_workout_id: item.workoutId,
        p_mutation_kind: item.kind,
        p_payload: item.payload,
      });
      if (result.error) throw result.error;
    },
  };
}
