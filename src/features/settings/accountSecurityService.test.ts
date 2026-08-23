import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createAccountSecurityService } from './accountSecurityService';

describe('account security service', () => {
  it('uses the verified authenticated-user password update boundary', async () => {
    const updateUser = vi.fn(async () => ({ data: { user: null }, error: null }));
    const service = createAccountSecurityService({ auth: { updateUser } } as unknown as SupabaseClient);

    await service.changePassword('new-password-123');

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });

  it('propagates provider failures without claiming the password changed', async () => {
    const providerError = new Error('reauthentication required');
    const updateUser = vi.fn(async () => ({ data: { user: null }, error: providerError }));
    const service = createAccountSecurityService({ auth: { updateUser } } as unknown as SupabaseClient);

    await expect(service.changePassword('new-password-123')).rejects.toBe(providerError);
  });
});
