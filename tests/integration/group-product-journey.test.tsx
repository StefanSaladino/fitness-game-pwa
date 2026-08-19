import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardService, DashboardSnapshot } from '../../src/features/dashboard';
import { GroupGate, type GroupInvite, type GroupMember, type GroupService, type GroupSummary, type ManagedGroupInvite } from '../../src/features/groups';
import { OnboardingScreen, type OnboardingInput, type OnboardingProfile } from '../../src/features/onboarding';
import { ProductController } from '../../src/features/product';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TEAMMATE_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const INVITE_TOKEN = '44444444-4444-4444-8444-444444444444';

const profile: OnboardingProfile = {
  id: USER_ID,
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-19T20:00:00Z',
};

const snapshot: DashboardSnapshot = {
  weekStart: '2026-08-17',
  weekEnd: '2026-08-23',
  weeklyTarget: 4,
  completedLiftingDays: 2,
  completedLiftingDates: ['2026-08-17', '2026-08-19'],
  weeklyXp: 115,
  xpBreakdown: { workout: 50, exercises: 25, progression: 30, cardio: 10 },
  recentLifts: [{
    id: 'lift-1', title: 'Upper body', scoringDate: '2026-08-19', startedAt: '2026-08-19T22:00:00Z',
    durationMinutes: 54, exerciseCount: 5, xp: 65,
  }],
  recentPrs: [{
    exerciseId: 'bench', exerciseName: 'Barbell Bench Press', metricType: 'E1RM', bestValue: 112,
    bestWeightKg: 100, bestReps: 4, achievedAt: '2026-08-19T22:30:00Z',
  }],
  leaderboard: [
    { rank: 1, userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 115, isCurrentUser: true },
    { rank: 2, userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 90, isCurrentUser: false },
  ],
  currentUserProfilePictureUrl: null,
};

function createMemoryGroupService(mode: 'create' | 'join' = 'create'): GroupService {
  let groups: GroupSummary[] = [];
  let members: GroupMember[] = [];
  let invites: ManagedGroupInvite[] = [];

  const makeGroup = (role: GroupSummary['role']): GroupSummary => ({
    id: GROUP_ID,
    name: role === 'OWNER' ? 'Iron Crew' : 'Night Crew',
    memberCount: 2,
    role,
    joinedAt: '2026-08-19T20:00:00Z',
    createdAt: '2026-08-19T20:00:00Z',
  });

  const ownerMember: GroupMember = {
    userId: mode === 'create' ? USER_ID : TEAMMATE_ID,
    username: mode === 'create' ? 'stefan' : 'alex',
    displayName: mode === 'create' ? 'Stefan' : 'Alex',
    profilePicturePath: null,
    profilePictureUrl: null,
    role: 'OWNER',
    joinedAt: '2026-08-19T20:00:00Z',
  };

  const otherMember: GroupMember = {
    userId: mode === 'create' ? TEAMMATE_ID : USER_ID,
    username: mode === 'create' ? 'alex' : 'stefan',
    displayName: mode === 'create' ? 'Alex' : 'Stefan',
    profilePicturePath: null,
    profilePictureUrl: null,
    role: 'MEMBER',
    joinedAt: '2026-08-19T20:05:00Z',
  };

  const service: GroupService = {
    async listGroups() { return groups.map((group) => ({ ...group })); },
    async createGroup(_userId, input) {
      const group = { ...makeGroup('OWNER'), name: input.name };
      groups = [group];
      members = [ownerMember, otherMember];
      return { ...group };
    },
    async getMembers() { return members.map((member) => ({ ...member })); },
    async createInvite() {
      const invite: ManagedGroupInvite = {
        id: 'invite-1', groupId: GROUP_ID, token: INVITE_TOKEN,
        expiresAt: '2099-08-26T20:00:00Z', maxUses: 25, useCount: 0, revokedAt: null,
        createdAt: '2026-08-19T20:10:00Z',
      };
      invites = [invite];
      const { createdAt: _createdAt, ...publicInvite } = invite;
      return publicInvite as GroupInvite;
    },
    async joinByInvite(token) {
      expect(token).toBe(INVITE_TOKEN);
      groups = [makeGroup('MEMBER')];
      members = [ownerMember, otherMember];
      return GROUP_ID;
    },
    async listInvites() { return invites.map((invite) => ({ ...invite })); },
    async renameGroup(_groupId, name) { groups = groups.map((group) => ({ ...group, name })); },
    async revokeInvite(inviteId) { invites = invites.map((invite) => invite.id === inviteId ? { ...invite, revokedAt: '2026-08-19T21:00:00Z' } : invite); },
    async setMemberRole(_groupId, targetUserId, role) { members = members.map((member) => member.userId === targetUserId ? { ...member, role } : member); },
    async removeMember(_groupId, targetUserId) { members = members.filter((member) => member.userId !== targetUserId); groups = groups.map((group) => ({ ...group, memberCount: members.length })); },
    async transferOwnership(_groupId, targetUserId) {
      members = members.map((member) => member.userId === USER_ID ? { ...member, role: 'MEMBER' } : member.userId === targetUserId ? { ...member, role: 'OWNER' } : member);
      groups = groups.map((group) => ({ ...group, role: 'MEMBER' }));
    },
    async leaveGroup() { groups = []; members = []; },
  };

  return service;
}

function JourneyHarness({ service, dashboardService }: { service: GroupService; dashboardService: DashboardService }) {
  const [, forceRender] = useState(0);
  return (
    <GroupGate service={service} userId={USER_ID}>
      {(groups, refreshGroups) => (
        <ProductController
          dashboardService={dashboardService}
          groupService={service}
          groups={groups}
          onGroupsChanged={async () => { await refreshGroups(); forceRender((value) => value + 1); }}
          profile={profile}
        />
      )}
    </GroupGate>
  );
}


function OnboardingToGroupHarness({ service }: { service: GroupService }) {
  const [completed, setCompleted] = useState(false);
  const [nextProfile, setNextProfile] = useState<OnboardingProfile>({ ...profile, username: 'u_pending', onboardingCompletedAt: null });

  if (!completed) {
    return (
      <OnboardingScreen
        busy={false}
        profile={nextProfile}
        onSubmit={async (input: OnboardingInput) => {
          setNextProfile((current) => ({
            ...current,
            username: input.username,
            displayName: input.displayName,
            timezone: input.timezone,
            weeklyWorkoutTarget: input.weeklyTarget,
            onboardingCompletedAt: '2026-08-19T20:00:00Z',
          }));
          setCompleted(true);
          return true;
        }}
      />
    );
  }

  return (
    <GroupGate service={service} userId={USER_ID}>
      {() => <div>group membership ready</div>}
    </GroupGate>
  );
}

describe('group-to-product integration journey', () => {
  it('moves from completed onboarding directly into persisted group setup', async () => {
    const user = userEvent.setup();
    const groupService = createMemoryGroupService('create');

    render(<OnboardingToGroupHarness service={groupService} />);

    expect(await screen.findByRole('heading', { name: 'Build your lifting identity.' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'stefan');
    await user.click(screen.getByRole('button', { name: 'Complete onboarding' }));

    expect(await screen.findByRole('heading', { name: /build the crew/i })).toBeInTheDocument();
  });

  it('creates a group, enters the real dashboard, then administers the crew', async () => {
    const user = userEvent.setup();
    const groupService = createMemoryGroupService('create');
    const dashboardService: DashboardService = { load: vi.fn(async () => snapshot) };

    render(<JourneyHarness dashboardService={dashboardService} service={groupService} />);

    expect(await screen.findByRole('heading', { name: /build the crew/i })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Iron Crew');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(screen.getByText('115 XP')).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({ groupId: GROUP_ID, userId: USER_ID }));

    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New invite' }));
    expect(await screen.findByText(INVITE_TOKEN)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Make admin' }));
    await waitFor(() => expect(screen.getByText('ADMIN')).toBeInTheDocument());
  });

  it('joins with a full invite URL and reaches the member dashboard without admin controls', async () => {
    const user = userEvent.setup();
    const groupService = createMemoryGroupService('join');
    const dashboardService: DashboardService = { load: vi.fn(async () => snapshot) };

    render(<JourneyHarness dashboardService={dashboardService} service={groupService} />);

    expect(await screen.findByRole('heading', { name: /build the crew/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await user.type(screen.getByRole('textbox', { name: 'Invite' }), `https://app.example.com/join/${INVITE_TOKEN}`);
    await user.click(screen.getByRole('button', { name: 'Join group' }));

    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(screen.getAllByText('Night Crew').length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New invite' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeInTheDocument();
  });
});
