import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccountAdminService } from '../platformAccountAdminService';
import { useUserAdministration } from './useUserAdministration';

const account = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'alpha',
  displayName: 'Alpha User',
  accountStatus: 'SUSPENDED' as const,
  createdAt: '2026-08-20T12:00:00.000Z',
  lastSignInAt: '2026-08-21T12:00:00.000Z',
  isPlatformAdmin: false,
  suspensionReviewAt: null,
  deletionRequestedAt: null,
  statusReason: 'Policy review',
  statusUpdatedAt: '2026-08-22T12:00:00.000Z',
  deletionRequestedBy: null,
};

function service(): PlatformAccountAdminService {
  return {
    list: vi.fn().mockResolvedValue({ items: [account], total: 1, page: 1, pageSize: 25 }),
    get: vi.fn().mockResolvedValue(account),
    suspend: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    requestDeletion: vi.fn().mockResolvedValue(undefined),
    cancelDeletion: vi.fn().mockResolvedValue(undefined),
    confirmDeletion: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useUserAdministration', () => {
  it('loads the bounded directory and selected detail', async () => {
    const api = service();
    const { result } = renderHook(() => useUserAdministration(api));
    await waitFor(() => expect(result.current.directoryState).toBe('ready'));
    expect(api.list).toHaveBeenCalledWith({ query: '', status: undefined, page: 1, pageSize: 25 });

    act(() => result.current.selectUser(account.userId));
    await waitFor(() => expect(result.current.detailState).toBe('ready'));
    expect(result.current.detail?.username).toBe('alpha');
  });

  it('runs an audited lifecycle action and reloads directory plus detail', async () => {
    const api = service();
    const { result } = renderHook(() => useUserAdministration(api));
    await waitFor(() => expect(result.current.directoryState).toBe('ready'));
    act(() => result.current.selectUser(account.userId));
    await waitFor(() => expect(result.current.detailState).toBe('ready'));

    await act(async () => {
      await result.current.restore('Review completed');
    });

    expect(api.restore).toHaveBeenCalledWith(account.userId, 'Review completed');
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBe('Account restored.');
  });

  it('keeps a server failure visible and does not claim success', async () => {
    const api = service();
    vi.mocked(api.confirmDeletion).mockRejectedValue(new Error('blocked'));
    const { result } = renderHook(() => useUserAdministration(api));
    await waitFor(() => expect(result.current.directoryState).toBe('ready'));
    act(() => result.current.selectUser(account.userId));
    await waitFor(() => expect(result.current.detailState).toBe('ready'));

    await act(async () => {
      await result.current.confirmDeletion('DELETE alpha');
    });

    expect(result.current.actionError).toMatch(/transfer ownership/i);
    expect(result.current.notice).toBeUndefined();
  });
});
