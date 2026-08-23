import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardService, DashboardSnapshot } from '../../src/features/dashboard';
import {
  GroupGate,
  type GroupInvite,
  type GroupMember,
  type GroupService,
  type GroupSummary,
  type ManagedGroupInvite,
  type PendingGroupInvite,
} from '../../src/features/groups';
import { OnboardingScreen, type OnboardingInput, type OnboardingProfile } from '../../src/features/onboarding';
import type { ExerciseProgressService } from '../../src/features/progress';
import type { GroupSocialService } from '../../src/features/social';
import { ProductController } from '../../src/features/product';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TEAMMATE_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_GROUP_ID = '44444444-4444-4444-8444-444444444444';

const profile: OnboardingProfile = {
  id: USER_ID,
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-19T20:00:00Z',
  profileCode: 'FG-1111111111',
  preferredWeightUnit: 'KG',
};

const progressService: ExerciseProgressService = {
  async listOverview() {
    return [{
      exerciseId: 'bench', canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS', metricType: 'E1RM',
      bestValue: 112, bestWeightKg: 100, bestReps: 4, achievedAt: '2026-08-19T22:30:00Z', previousPrValue: 108,
      sessionCount: 4, observationCount: 4, firstPerformedAt: '2026-08-10T22:00:00Z', lastPerformedAt: '2026-08-19T22:30:00Z',
      averageDaysBetweenSessions: 3, latestMetricValue: 112, latestWeightKg: 100, latestReps: 4, latestObservedAt: '2026-08-19T22:30:00Z',
    }];
  },
  async loadCalendarSummaries() {
    return [
      { periodKind: 'WEEK', periodStart: '2026-08-10', periodEnd: '2026-08-16', completedLiftingSessions: 2, exerciseCount: 5, completedWorkingSets: 20, volumeKgReps: 10000, prCount: 1 },
      { periodKind: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23', completedLiftingSessions: 3, exerciseCount: 6, completedWorkingSets: 28, volumeKgReps: 13200, prCount: 2 },
      { periodKind: 'MONTH', periodStart: '2026-07-01', periodEnd: '2026-07-31', completedLiftingSessions: 7, exerciseCount: 8, completedWorkingSets: 76, volumeKgReps: 38000, prCount: 2 },
      { periodKind: 'MONTH', periodStart: '2026-08-01', periodEnd: '2026-08-31', completedLiftingSessions: 9, exerciseCount: 10, completedWorkingSets: 91, volumeKgReps: 45500, prCount: 4 },
    ];
  },
  async loadHistory() {
    return [{
      workoutId: 'lift-1', scoringDate: '2026-08-19', observedAt: '2026-08-19T22:30:00Z', metricType: 'E1RM', metricValue: 112,
      weightKg: 100, reps: 4, previousPrValue: 108, isBaseline: false, isPr: true, isCurrentPr: true,
      completedWorkingSets: 4, sessionVolumeKgReps: 1600, heaviestWeightKg: 100, maxCompletedReps: 4,
      plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
    }];
  },
};

const socialService: GroupSocialService = {
  async loadLeaderboard(_groupId, period) {
    return {
      period,
      periodStart: period === 'WEEK' ? '2026-08-17' : null,
      periodEnd: period === 'WEEK' ? '2026-08-23' : null,
      entries: [
        { rank: 1, userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: period === 'WEEK' ? 115 : 900, liftingDays: period === 'WEEK' ? 2 : 16, prCount: 7, badgeCount: 6, isCurrentUser: true },
        { rank: 2, userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: period === 'WEEK' ? 90 : 850, liftingDays: period === 'WEEK' ? 2 : 15, prCount: 5, badgeCount: 4, isCurrentUser: false },
      ],
    };
  },
  async loadFeed() {
    return {
      items: [{
        activityKey: 'PR:integration-opaque', activityType: 'PR' as const, activityAt: '2026-08-19T22:30:00Z', actorUserId: USER_ID,
        username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
        metadata: { exerciseName: 'Barbell Bench Press', metricType: 'E1RM' as const, metricValue: 112, previousBest: 108, weightKg: 100, reps: 4, scoringDate: '2026-08-19' },
        reactions: { FIRE: 1, STRONG: 0, CLAP: 0 }, myReaction: null,
      }],
      nextCursor: null,
    };
  },
  async setReaction() {},
};

const snapshot: DashboardSnapshot = {
  weekStart: '2026-08-17', weekEnd: '2026-08-23', weeklyTarget: 4, completedLiftingDays: 2,
  completedLiftingDates: ['2026-08-17', '2026-08-19'], weeklyXp: 115,
  xpBreakdown: { workout: 50, exercises: 25, progression: 30, cardio: 10 },
  recentLifts: [{ id: 'lift-1', title: 'Upper body', scoringDate: '2026-08-19', startedAt: '2026-08-19T22:00:00Z', durationMinutes: 54, exerciseCount: 5, xp: 65 }],
  recentPrs: [{ exerciseId: 'bench', exerciseName: 'Barbell Bench Press', metricType: 'E1RM', bestValue: 112, bestWeightKg: 100, bestReps: 4, achievedAt: '2026-08-19T22:30:00Z' }],
  leaderboard: [
    { rank: 1, userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 115, isCurrentUser: true },
    { rank: 2, userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 90, isCurrentUser: false },
  ],
  currentUserProfilePictureUrl: null,
  consistency: {
    currentWeekStart: '2026-08-17', currentWeekTarget: 4, currentWeekLiftingDays: 2,
    currentCompletedWeekStreak: 2, bestCompletedWeekStreak: 3, completedWeeks: 4, goalsHit: 3, recentWeeks: [], badges: [],
  },
};

interface MemoryOptions {
  initialGroups?: GroupSummary[];
  pendingInvites?: PendingGroupInvite[];
  initialMembers?: Record<string, GroupMember[]>;
}

function selfMember(role: GroupMember['role']): GroupMember {
  return {
    userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePicturePath: null, profilePictureUrl: null,
    role, joinedAt: '2026-08-20T20:00:00Z',
  };
}

const teammateMember: GroupMember = {
  userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePicturePath: null, profilePictureUrl: null,
  role: 'MEMBER', joinedAt: '2026-08-20T20:05:00Z',
};

const teammateOwner: GroupMember = { ...teammateMember, role: 'OWNER' };

function createMemoryGroupService(options: MemoryOptions = {}) {
  let groups = (options.initialGroups ?? []).map((group) => ({ ...group }));
  let pending = (options.pendingInvites ?? []).map((invite) => ({ ...invite }));
  let outgoing: ManagedGroupInvite[] = [];
  const membersByGroup = new Map<string, GroupMember[]>();

  for (const group of groups) {
    const supplied = options.initialMembers?.[group.id];
    membersByGroup.set(group.id, supplied ? supplied.map((member) => ({ ...member })) : [selfMember(group.role)]);
  }

  let createdCount = 0;
  const service: GroupService = {
    async listGroups() { return groups.map((group) => ({ ...group })); },
    async createGroup(_userId, input) {
      createdCount += 1;
      const id = createdCount === 1 && groups.length === 0 ? GROUP_ID : `created-${createdCount}`;
      const created: GroupSummary = {
        id, name: input.name, memberCount: 1, role: 'OWNER',
        joinedAt: '2026-08-23T20:00:00Z', createdAt: '2026-08-23T20:00:00Z',
      };
      groups = [...groups, created];
      membersByGroup.set(id, [{ ...selfMember('OWNER'), joinedAt: created.joinedAt }]);
      return { ...created };
    },
    async getMembers(groupId) { return (membersByGroup.get(groupId) ?? []).map((member) => ({ ...member })); },
    async createInvite(_userId, groupId, recipient) {
      const invite: GroupInvite = {
        id: 'invite-out', groupId, invitedUserId: TEAMMATE_ID, invitedUsername: recipient.replace(/^@/, ''),
        invitedDisplayName: 'Alex', createdAt: '2026-08-23T20:10:00Z',
      };
      outgoing = [...outgoing, invite];
      return { ...invite };
    },
    async joinByInvite() { throw new Error('Reusable invite codes are no longer supported.'); },
    async listInvites(groupId) { return outgoing.filter((invite) => invite.groupId === groupId).map((invite) => ({ ...invite })); },
    async listPendingInvites() { return pending.map((invite) => ({ ...invite })); },
    async acceptInvite(id) {
      const invite = pending.find((item) => item.id === id);
      if (!invite) throw new Error('Invite missing');
      pending = pending.filter((item) => item.id !== id);
      const joined: GroupSummary = {
        id: invite.groupId, name: invite.groupName, memberCount: 2, role: 'MEMBER',
        joinedAt: '2026-08-23T20:15:00Z', createdAt: '2026-08-20T20:00:00Z',
      };
      if (!groups.some((group) => group.id === joined.id)) groups = [...groups, joined];
      membersByGroup.set(joined.id, [teammateOwner, { ...selfMember('MEMBER'), joinedAt: joined.joinedAt }]);
      return joined.id;
    },
    async declineInvite(id) { pending = pending.filter((invite) => invite.id !== id); },
    async renameGroup(id, name) { groups = groups.map((group) => group.id === id ? { ...group, name } : group); },
    async revokeInvite(id) { outgoing = outgoing.filter((invite) => invite.id !== id); },
    async setMemberRole(groupId, targetUserId, role) {
      membersByGroup.set(groupId, (membersByGroup.get(groupId) ?? []).map((member) => member.userId === targetUserId ? { ...member, role } : member));
    },
    async removeMember(groupId, targetUserId) {
      membersByGroup.set(groupId, (membersByGroup.get(groupId) ?? []).filter((member) => member.userId !== targetUserId));
    },
    async transferOwnership(groupId, targetUserId) {
      membersByGroup.set(groupId, (membersByGroup.get(groupId) ?? []).map((member) => member.userId === USER_ID ? { ...member, role: 'MEMBER' } : member.userId === targetUserId ? { ...member, role: 'OWNER' } : member));
      groups = groups.map((group) => group.id === groupId ? { ...group, role: 'MEMBER' } : group);
    },
    async leaveGroup(groupId) {
      groups = groups.filter((group) => group.id !== groupId);
      membersByGroup.delete(groupId);
    },
  };
  return service;
}

const dashboardService: DashboardService = {
  load: vi.fn(async (input) => ({ ...snapshot, leaderboard: input.groupId ? snapshot.leaderboard : [] })),
};

function JourneyHarness({ service, initialProfile = profile }: { service: GroupService; initialProfile?: OnboardingProfile }) {
  return (
    <GroupGate service={service} userId={USER_ID}>
      {(groups, refreshGroups) => (
        <ProductController
          dashboardService={dashboardService}
          groupService={service}
          groups={groups}
          onGroupsChanged={refreshGroups}
          profile={initialProfile}
          progressService={progressService}
          socialService={socialService}
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
            onboardingCompletedAt: '2026-08-23T20:00:00Z',
          }));
          setCompleted(true);
          return true;
        }}
      />
    );
  }
  return <JourneyHarness initialProfile={nextProfile} service={service} />;
}

const firstInvite: PendingGroupInvite = {
  id: 'invite-in', groupId: GROUP_ID, groupName: 'Night Crew', invitedByUserId: TEAMMATE_ID,
  invitedByUsername: 'alex', invitedByDisplayName: 'Alex', createdAt: '2026-08-23T18:00:00Z',
};
const secondInvite: PendingGroupInvite = {
  id: 'invite-second', groupId: SECOND_GROUP_ID, groupName: 'Weekend Crew', invitedByUserId: TEAMMATE_ID,
  invitedByUsername: 'alex', invitedByDisplayName: 'Alex', createdAt: '2026-08-23T19:00:00Z',
};
const existingGroup: GroupSummary = {
  id: GROUP_ID, name: 'Iron Crew', memberCount: 1, role: 'OWNER',
  joinedAt: '2026-08-20T20:00:00Z', createdAt: '2026-08-20T20:00:00Z',
};
const memberGroup: GroupSummary = { ...existingGroup, memberCount: 2, role: 'MEMBER' };

describe('group-to-product integration journey', () => {
  it('moves from completed onboarding directly into the personal dashboard with zero groups', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService();
    render(<OnboardingToGroupHarness service={service} />);
    expect(await screen.findByRole('heading', { name: 'Build your lifting identity.' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'stefan');
    await user.click(screen.getByRole('button', { name: 'Complete onboarding' }));
    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Groups are optional.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /build the crew/i })).not.toBeInTheDocument();
    expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({ groupId: null, userId: USER_ID }));
  });

  it('lets a solo user accept a targeted invitation from the dashboard when they choose', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService({ pendingInvites: [firstInvite] });
    render(<JourneyHarness service={service} />);
    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(await screen.findByText('Night Crew')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(screen.getAllByText('Night Crew').length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText(/currently belong to 1 group/i)).toBeInTheDocument();
  });

  it('lets a solo user create a group later from Groups without blocking personal training first', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService();
    render(<JourneyHarness service={service} />);
    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Train solo or add a group when you want.' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Iron Crew');
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText(/currently belong to 1 group/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your groups' })).toBeInTheDocument();
  });

  it('keeps memberships additive when an existing owner accepts another invitation', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService({ initialGroups: [existingGroup], pendingInvites: [secondInvite] });
    render(<JourneyHarness service={service} />);
    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(await screen.findByText(/does not replace any group you already belong to/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText(/currently belong to 2 groups/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Group' })).toBeInTheDocument();
    expect(within(screen.getByRole('combobox', { name: 'Group' })).getByRole('option', { name: 'Weekend Crew' })).toBeInTheDocument();
  });

  it('retains owner administration across the integrated journey', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService({
      initialGroups: [{ ...existingGroup, memberCount: 2 }],
      initialMembers: { [GROUP_ID]: [selfMember('OWNER'), teammateMember] },
    });
    render(<JourneyHarness service={service} />);
    await screen.findByRole('heading', { name: 'Your lifting week' });
    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('button', { name: 'Make admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeInTheDocument();
  });

  it('keeps the member dashboard without admin controls while preserving member actions', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService({
      initialGroups: [memberGroup],
      initialMembers: { [GROUP_ID]: [teammateOwner, selfMember('MEMBER')] },
    });
    render(<JourneyHarness service={service} />);
    expect(await screen.findByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Groups' })[0]!);
    expect(await screen.findByRole('button', { name: 'Leave group' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send invite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make admin' })).not.toBeInTheDocument();
  });

  it('still keeps group competition and personal progress behind their proper product boundaries', async () => {
    const user = userEvent.setup();
    const service = createMemoryGroupService({ initialGroups: [existingGroup] });
    render(<JourneyHarness service={service} />);
    await screen.findByRole('heading', { name: 'Your lifting week' });
    await user.click(screen.getAllByRole('button', { name: 'Compete' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Crew standings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Progress' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Know your trend. Beat your last.' })).toBeInTheDocument();
  });
});