import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createPlatformAccessService } from './platformAccessService';

function fakeClient(result: unknown, error: unknown = null): SupabaseClient {
  return { rpc: async () => ({ data: result, error }) } as unknown as SupabaseClient;
}

describe('platform access service', () => {
  it('maps the server-backed platform access result', async () => {
    await expect(createPlatformAccessService(fakeClient([
      { account_status: 'ACTIVE', is_platform_admin: true },
    ])).load()).resolves.toEqual({ accountStatus: 'ACTIVE', isPlatformAdmin: true });
  });

  it('fails closed for malformed access results', async () => {
    await expect(createPlatformAccessService(fakeClient([])).load()).rejects.toThrow();
    await expect(createPlatformAccessService(fakeClient([
      { account_status: 'ACTIVE', is_platform_admin: 'yes' },
    ])).load()).rejects.toThrow();
  });
});
