import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export interface AccountSecurityService {
  changePassword(password: string): Promise<void>;
}

export function createAccountSecurityService(
  client: SupabaseClient = getSupabaseClient(),
): AccountSecurityService {
  return {
    async changePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
  };
}
