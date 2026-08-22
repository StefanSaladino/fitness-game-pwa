import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createPlatformAccountAdminService } from './platformAccountAdminService';

const BASE_ROW = {
  user_id: '11111111-1111-4111-8111-111111111111',
  username: 'alpha',
  display_name: 'Alpha User',
  account_status: 'ACTIVE',
  created_at: '2026-08-22T10:00:00.000Z',
  last_sign_in_at: '2026-08-22T11:00:00.000Z',
  is_platform_admin: false,
  suspension_review_at: null,
  deletion_requested_at: null,
  total_count: '1',
};

function clientWithRpc(rpc: ReturnType<typeof vi.fn>, invoke = vi.fn()) {
  return { rpc, functions: { invoke } } as unknown as SupabaseClient;
}

describe('platform account admin service', () => {
  it('maps the bounded directory contract without exposing raw Auth data', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [BASE_ROW], error: null });
    const service = createPlatformAccountAdminService(clientWithRpc(rpc));

    await expect(service.list()).resolves.toEqual({
      items: [{
        userId: BASE_ROW.user_id,
        username: 'alpha',
        displayName: 'Alpha User',
        accountStatus: 'ACTIVE',
        createdAt: BASE_ROW.created_at,
        lastSignInAt: BASE_ROW.last_sign_in_at,
        isPlatformAdmin: false,
        suspensionReviewAt: null,
        deletionRequestedAt: null,
      }],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    expect(rpc).toHaveBeenCalledWith('list_platform_accounts', {
      p_query: null,
      p_status: null,
      p_page: 1,
      p_page_size: 25,
    });
  });

  it('passes search, status, and pagination through the guarded RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const service = createPlatformAccountAdminService(clientWithRpc(rpc));

    await service.list({ query: ' alpha ', status: 'SUSPENDED', page: 2, pageSize: 10 });

    expect(rpc).toHaveBeenCalledWith('list_platform_accounts', {
      p_query: 'alpha',
      p_status: 'SUSPENDED',
      p_page: 2,
      p_page_size: 10,
    });
  });

  it('maps account detail status metadata', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        ...BASE_ROW,
        total_count: undefined,
        account_status: 'SUSPENDED',
        status_reason: 'Policy review',
        status_updated_at: '2026-08-22T12:00:00.000Z',
        suspension_review_at: '2026-08-25T12:00:00.000Z',
        deletion_requested_by: null,
      }],
      error: null,
    });
    const service = createPlatformAccountAdminService(clientWithRpc(rpc));

    const detail = await service.get(BASE_ROW.user_id);

    expect(detail.accountStatus).toBe('SUSPENDED');
    expect(detail.statusReason).toBe('Policy review');
    expect(detail.suspensionReviewAt).toBe('2026-08-25T12:00:00.000Z');
  });

  it('routes Auth lifecycle changes through the server boundary and deletion state through RPCs', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createPlatformAccountAdminService(clientWithRpc(rpc, invoke));

    await service.suspend(BASE_ROW.user_id, 'Policy review', '2026-08-25T12:00:00.000Z');
    await service.restore(BASE_ROW.user_id, 'Review completed');
    await service.requestDeletion(BASE_ROW.user_id, 'Confirmed destructive request');
    await service.cancelDeletion(BASE_ROW.user_id, 'Deletion request cancelled');

    expect(invoke).toHaveBeenNthCalledWith(1, 'platform-account-auth', {
      body: {
        action: 'SUSPEND',
        userId: BASE_ROW.user_id,
        reason: 'Policy review',
        reviewAt: '2026-08-25T12:00:00.000Z',
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'platform-account-auth', {
      body: {
        action: 'RESTORE',
        userId: BASE_ROW.user_id,
        reason: 'Review completed',
      },
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'request_platform_account_deletion', {
      p_target_user_id: BASE_ROW.user_id,
      p_reason: 'Confirmed destructive request',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'cancel_platform_account_deletion', {
      p_target_user_id: BASE_ROW.user_id,
      p_reason: 'Deletion request cancelled',
    });
  });

  it('fails closed on malformed account state instead of guessing', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ ...BASE_ROW, account_status: 'UNKNOWN' }],
      error: null,
    });
    const service = createPlatformAccountAdminService(clientWithRpc(rpc));

    await expect(service.list()).rejects.toThrow('Invalid platform account status.');
  });
});
