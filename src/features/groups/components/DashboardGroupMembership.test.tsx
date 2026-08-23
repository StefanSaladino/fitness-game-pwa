import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import type { GroupSummary, PendingGroupInvite } from '../model';
import { DashboardGroupMembership } from './DashboardGroupMembership';

const group: GroupSummary = {
  id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'MEMBER',
  joinedAt: '2026-08-23T12:00:00Z', createdAt: '2026-08-20T12:00:00Z',
};

function service(invites: PendingGroupInvite[] = []): GroupService {
  return {
    listGroups: vi.fn(async () => [group]),
    createGroup: vi.fn(async () => group),
    getMembers: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({ id: 'out', groupId: group.id, invitedUserId: 'u2', invitedUsername: 'alex', invitedDisplayName: 'Alex', createdAt: 'x' })),
    joinByInvite: vi.fn(async () => group.id),
    listInvites: vi.fn(async () => []),
    listPendingInvites: vi.fn(async () => invites),
    acceptInvite: vi.fn(async () => invites[0]?.groupId ?? group.id),
    declineInvite: vi.fn(async () => undefined),
    renameGroup: vi.fn(async () => undefined),
    revokeInvite: vi.fn(async () => undefined),
    setMemberRole: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    transferOwnership: vi.fn(async () => undefined),
    leaveGroup: vi.fn(async () => undefined),
  };
}

describe('DashboardGroupMembership', () => {
  it('tells a zero-group user that group membership is optional', async () => {
    const onNavigate = vi.fn();
    render(<DashboardGroupMembership groupCount={0} onGroupsChanged={vi.fn()} onNavigate={onNavigate} service={service()} />);

    expect(await screen.findByRole('heading', { name: 'Groups are optional.' })).toBeInTheDocument();
    expect(screen.getByText(/dashboard, workouts, cardio, and progress work without a group/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Manage groups' }));
    expect(onNavigate).toHaveBeenCalledWith('groups');
  });

  it('accepts a pending invitation without replacing existing group membership', async () => {
    const invite: PendingGroupInvite = {
      id: 'invite-2', groupId: 'group-2', groupName: 'Sunday Crew', invitedByUserId: 'u2',
      invitedByUsername: 'alex', invitedByDisplayName: 'Alex', createdAt: '2026-08-23T13:00:00Z',
    };
    const groupService = service([invite]);
    const onGroupsChanged = vi.fn(async () => undefined);
    render(<DashboardGroupMembership groupCount={1} onGroupsChanged={onGroupsChanged} onNavigate={vi.fn()} service={groupService} />);

    expect(await screen.findByText(/does not replace any group you already belong to/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(groupService.acceptInvite).toHaveBeenCalledWith('invite-2'));
    expect(onGroupsChanged).toHaveBeenCalled();
  });
});
