import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import type { GroupSummary } from '../model';
import { useGroupAdministration } from './useGroupAdministration';

const group: GroupSummary = {
  id: 'group-1', name: 'Iron Crew', memberCount: 2, role: 'OWNER',
  joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z',
};

function service(): GroupService {
  return {
    listGroups: vi.fn(async () => [group]),
    createGroup: vi.fn(async () => group),
    getMembers: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({
      id: 'invite-1', groupId: group.id, token: '6ccccccc-cccc-4ccc-8ccc-cccccccccccc',
      expiresAt: '2099-08-26T20:00:00Z', maxUses: 25, useCount: 0, revokedAt: null,
    })),
    joinByInvite: vi.fn(async () => group.id),
    listInvites: vi.fn(async () => []),
    renameGroup: vi.fn(async () => undefined),
    revokeInvite: vi.fn(async () => undefined),
    setMemberRole: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    transferOwnership: vi.fn(async () => undefined),
    leaveGroup: vi.fn(async () => undefined),
  };
}

describe('useGroupAdministration', () => {
  it('loads members and invite state for an owner', async () => {
    const api = service();
    const { result } = renderHook(() => useGroupAdministration({ userId: 'owner-1', group, service: api }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(api.getMembers).toHaveBeenCalledWith('group-1');
    expect(api.listInvites).toHaveBeenCalledWith('group-1');
  });

  it('does not request private invite administration data for an ordinary member', async () => {
    const api = service();
    const memberGroup = { ...group, role: 'MEMBER' as const };
    const { result } = renderHook(() => useGroupAdministration({ userId: 'member-1', group: memberGroup, service: api }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(api.getMembers).toHaveBeenCalledWith('group-1');
    expect(api.listInvites).not.toHaveBeenCalled();
  });

  it('delegates role changes to the service and refreshes persisted group state', async () => {
    const api = service();
    const onGroupsChanged = vi.fn(async () => undefined);
    const { result } = renderHook(() => useGroupAdministration({ userId: 'owner-1', group, service: api, onGroupsChanged }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.setMemberRole('member-1', 'ADMIN'); });

    expect(api.setMemberRole).toHaveBeenCalledWith('group-1', 'member-1', 'ADMIN');
    expect(onGroupsChanged).toHaveBeenCalled();
  });
});
