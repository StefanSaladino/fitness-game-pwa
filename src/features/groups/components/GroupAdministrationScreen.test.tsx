import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupMember, GroupSummary, ManagedGroupInvite } from '../model';
import { GroupAdministrationScreen } from './GroupAdministrationScreen';

const profile: OnboardingProfile = {
  id: 'owner-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00Z',
};

const ownerGroup: GroupSummary = {
  id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'OWNER',
  joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z',
};

const members: GroupMember[] = [
  { userId: 'owner-1', username: 'stefan', displayName: 'Stefan', profilePicturePath: null, profilePictureUrl: null, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z' },
  { userId: 'admin-1', username: 'alex', displayName: 'Alex', profilePicturePath: null, profilePictureUrl: null, role: 'ADMIN', joinedAt: '2026-08-18T01:00:00Z' },
  { userId: 'member-1', username: 'sam', displayName: 'Sam', profilePicturePath: null, profilePictureUrl: null, role: 'MEMBER', joinedAt: '2026-08-18T02:00:00Z' },
];

const invite: ManagedGroupInvite = {
  id: 'invite-1', groupId: 'group-1', token: '6ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  expiresAt: '2099-08-26T20:00:00Z', maxUses: 25, useCount: 2, revokedAt: null,
  createdAt: '2026-08-19T20:00:00Z',
};

function renderScreen(group: GroupSummary) {
  render(
    <GroupAdministrationScreen
      busyAction={null}
      error=""
      group={group}
      groups={[group]}
      invites={group.role === 'MEMBER' ? [] : [invite]}
      members={members}
      onCreateInvite={vi.fn(async () => undefined)}
      onLeaveGroup={vi.fn(async () => undefined)}
      onNavigate={vi.fn()}
      onRemoveMember={vi.fn(async () => undefined)}
      onRename={vi.fn(async () => undefined)}
      onRevokeInvite={vi.fn(async () => undefined)}
      onSelectGroup={vi.fn()}
      onSetMemberRole={vi.fn(async () => undefined)}
      onSignOut={vi.fn()}
      onTransferOwnership={vi.fn(async () => undefined)}
      profile={profile}
    />,
  );
}

describe('GroupAdministrationScreen', () => {
  it('shows owner-only role controls and invite administration without decorative dashboard filler', () => {
    renderScreen(ownerGroup);

    expect(screen.getByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make admin' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Transfer ownership' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave group' })).not.toBeInTheDocument();
    expect(screen.queryByText(/unlock your potential/i)).not.toBeInTheDocument();
  });

  it('keeps ordinary members read-only except for leaving the group', () => {
    renderScreen({ ...ownerGroup, role: 'MEMBER' });

    expect(screen.queryByRole('heading', { name: 'Invites' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save name' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeInTheDocument();
  });
});
