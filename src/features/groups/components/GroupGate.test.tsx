import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import type { GroupSummary } from '../model';
import { GroupGate } from './GroupGate';

const group: GroupSummary = {
  id: 'group-1',
  name: 'Iron Crew',
  memberCount: 6,
  role: 'OWNER',
  joinedAt: '2026-08-19T20:00:00Z',
  createdAt: '2026-08-19T20:00:00Z',
};

function service(groups: GroupSummary[]): GroupService {
  return {
    listGroups: vi.fn(async () => groups),
    createGroup: vi.fn(async () => group),
    getMembers: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({
      id: 'invite-1', groupId: group.id, invitedUserId: 'member-1', invitedUsername: 'alex',
      invitedDisplayName: 'Alex', createdAt: '2026-08-20T00:00:00Z',
    })),
    joinByInvite: vi.fn(async () => group.id),
    listInvites: vi.fn(async () => []),
    listPendingInvites: vi.fn(async () => []),
    acceptInvite: vi.fn(async () => group.id),
    declineInvite: vi.fn(async () => undefined),
    renameGroup: vi.fn(async () => undefined),
    revokeInvite: vi.fn(async () => undefined),
    setMemberRole: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    transferOwnership: vi.fn(async () => undefined),
    leaveGroup: vi.fn(async () => undefined),
  };
}

describe('GroupGate', () => {
  it('passes zero groups through as a valid product state', async () => {
    render(
      <GroupGate service={service([])} userId="user-1">
        {(loaded) => <p>Dashboard with {loaded.length} groups</p>}
      </GroupGate>,
    );
    expect(await screen.findByText('Dashboard with 0 groups')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /build the crew/i })).not.toBeInTheDocument();
  });

  it('passes every loaded group through without assuming a single membership', async () => {
    const groups = [group, { ...group, id: 'group-2', name: 'Second Crew', role: 'MEMBER' as const }];
    render(
      <GroupGate service={service(groups)} userId="user-1">
        {(loaded) => <p>{loaded.length} groups ready</p>}
      </GroupGate>,
    );
    expect(await screen.findByText('2 groups ready')).toBeInTheDocument();
  });
});
