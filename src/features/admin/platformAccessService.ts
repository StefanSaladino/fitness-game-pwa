import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export type PlatformAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';

export interface PlatformAccess {
  accountStatus: PlatformAccountStatus;
  isPlatformAdmin: boolean;
}

export interface PlatformAccessService {
  load(): Promise<PlatformAccess>;
}

type PlatformAccessRow = {
  account_status: PlatformAccountStatus;
  is_platform_admin: boolean;
};

export function createPlatformAccessService(client: SupabaseClient = getSupabaseClient()): PlatformAccessService {
  return {
    async load() {
      const { data, error } = await client.rpc('get_my_platform_access');
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1) throw new Error('Platform access response is unavailable.');
      const row = data[0] as PlatformAccessRow;
      if (!['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'].includes(row.account_status) || typeof row.is_platform_admin !== 'boolean') {
        throw new Error('Platform access response is invalid.');
      }
      return {
        accountStatus: row.account_status,
        isPlatformAdmin: row.is_platform_admin,
      };
    },
  };
}
