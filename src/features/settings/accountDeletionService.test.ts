import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createAccountDeletionService } from './accountDeletionService';

function clientWith(rpc: ReturnType<typeof vi.fn>, invoke = vi.fn()) {
  return { rpc, functions: { invoke } } as unknown as SupabaseClient;
}

describe('account deletion service', () => {
  it('uses the own-account request RPC and returns its server-derived confirmation', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'DELETE alpha', error: null });
    const service = createAccountDeletionService(clientWith(rpc));

    await expect(service.request()).resolves.toBe('DELETE alpha');
    expect(rpc).toHaveBeenCalledWith('request_own_platform_account_deletion');
  });

  it('routes pending-account cancellation through the server boundary', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createAccountDeletionService(clientWith(vi.fn(), invoke));

    await service.cancel();

    expect(invoke).toHaveBeenCalledWith('platform-account-auth', {
      body: { action: 'CANCEL_DELETE_SELF' },
    });
  });

  it('sends only the exact confirmation to the self-deletion server action', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createAccountDeletionService(clientWith(vi.fn(), invoke));

    await service.confirm('DELETE alpha');

    expect(invoke).toHaveBeenCalledWith('platform-account-auth', {
      body: {
        action: 'DELETE_SELF',
        confirmation: 'DELETE alpha',
      },
    });
  });

  it('fails closed when the request RPC does not return a confirmation phrase', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createAccountDeletionService(clientWith(rpc));

    await expect(service.request()).rejects.toThrow('Invalid account deletion confirmation.');
  });
});
