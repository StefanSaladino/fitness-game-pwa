import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export interface AccountDeletionService {
  request(): Promise<string>;
  cancel(): Promise<void>;
  confirm(confirmation: string): Promise<void>;
}

export function createAccountDeletionService(
  client: SupabaseClient = getSupabaseClient(),
): AccountDeletionService {
  return {
    async request() {
      const { data, error } = await client.rpc('request_own_platform_account_deletion');
      if (error) throw error;
      if (typeof data !== 'string' || !data.startsWith('DELETE ')) {
        throw new Error('Invalid account deletion confirmation.');
      }
      return data;
    },

    async cancel() {
      const { error } = await client.functions.invoke('platform-account-auth', {
        body: { action: 'CANCEL_DELETE_SELF' },
      });
      if (error) throw error;
    },

    async confirm(confirmation) {
      const { error } = await client.functions.invoke('platform-account-auth', {
        body: {
          action: 'DELETE_SELF',
          confirmation,
        },
      });
      if (error) throw error;
    },
  };
}
