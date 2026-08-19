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
      id: 'invite-1', groupId: group.id, token: '6ccccccc-cccc-4ccc-8ccc-cccccccccccc',
      expiresAt: '2026-08-26T20:00:00Z', maxUses: 25, useCount: 0, revokedAt: null,
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

describe('GroupGate', () => {
  it('shows setup only when the user has zero active groups', async () => {
    render(<GroupGate service={service([])} userId="user-1">{() => <p>Dashboard</p>}</GroupGate>);
    expect(await screen.findByRole('heading', { name: /build the crew/i })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
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
