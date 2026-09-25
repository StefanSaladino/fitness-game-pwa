import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export interface TutorialService {
  complete(version: number): Promise<number>;
}

export function createTutorialService(
  client: SupabaseClient = getSupabaseClient(),
): TutorialService {
  return {
    async complete(version) {
      if (!Number.isInteger(version) || version < 1 || version > 99) {
        throw new RangeError('Tutorial version must be a whole number from 1 to 99.');
      }

      const { data, error } = await client.rpc('complete_my_tutorial', {
        p_version: version,
      });

      if (error) throw error;

      const completed = Number(data);
      if (!Number.isInteger(completed) || completed < version) {
        throw new Error('Tutorial completion response was invalid.');
      }

      return completed;
    },
  };
}
