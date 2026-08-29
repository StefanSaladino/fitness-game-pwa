import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { AuthLayout } from '../../src/features/auth/components/AuthLayout';
import { SignUpForm } from '../../src/features/auth/components/SignUpForm';
import { ForgotPasswordForm } from '../../src/features/auth/components/ForgotPasswordForm';
import { VerifyEmailPanel } from '../../src/features/auth/components/VerifyEmailPanel';
import { PrivacyPolicyPage } from '../../src/features/legal/PrivacyPolicyPage';
import { DashboardScreen } from '../../src/features/dashboard/components/DashboardScreen';
import type { DashboardSnapshot } from '../../src/features/dashboard/model';
import { WorkoutPresetStartScreen } from '../../src/features/workout/components/WorkoutPresetStartScreen';
import { presetWorkoutById } from '../../src/features/workout/presetWorkouts';
import type { ExercisePickerItem } from '../../src/features/workout/model';
import { OptionalGroupSetupScreen } from '../../src/features/groups/components/OptionalGroupSetupScreen';
import type { GroupService, GroupSummary } from '../../src/features/groups';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import type { SettingsService } from '../../src/features/settings/settingsService';
import type { AccountDeletionService } from '../../src/features/settings/accountDeletionService';
import type { AccountSecurityService } from '../../src/features/settings/accountSecurityService';
import type { NotificationPreferenceService, NotificationPreferences } from '../../src/features/settings/notificationPreferenceService';
import type { ProfilePictureService } from '../../src/features/profile-picture/profilePictureService';
import type { PwaService, PwaSnapshot } from '../../src/pwa/pwaService';
import type { PushNotificationService } from '../../src/pwa/pushNotificationService';
import type { PlatformAccessService } from '../../src/features/admin/platformAccessService';
import { PlatformAdminShell } from '../../src/features/admin/components/PlatformAdminShell';
import { ModerationWorkspaceScreen } from '../../src/features/admin/moderation/components/ModerationWorkspaceScreen';
import type { ModerationActivityType, ModerationCaseDirectoryPage, ModerationCaseRecord } from '../../src/features/admin/moderation/model';
import { PlatformMessagingController } from '../../src/features/admin/messaging/components/PlatformMessagingController';
import type { PlatformMessagingService } from '../../src/features/admin/messaging/platformMessagingService';
import type { OnboardingProfile } from '../../src/features/onboarding';
import '../../src/styles/global.css';

const measuredAt = '2026-08-27T16:00:00.000Z';
const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00.000Z', profileCode: 'FG-1111111111', preferredWeightUnit: 'KG',
};
const group: GroupSummary = {
  id: 'group-1', name: 'The Iron Crew', memberCount: 3, role: 'OWNER', joinedAt: measuredAt, createdAt: measuredAt,
};
const dashboard: DashboardSnapshot = {
  weekStart: '2026-08-24', weekEnd: '2026-08-30', weeklyTarget: 4, completedLiftingDays: 2,
  completedLiftingDates: ['2026-08-24', '2026-08-26'], weeklyXp: 90,
  xpBreakdown: { workout: 50, exercises: 25, progression: 10, cardio: 5 }, currentUserProfilePictureUrl: null,
  recentLifts: [{ id: 'lift-1', title: 'Upper Push', scoringDate: '2026-08-26', startedAt: measuredAt, durationMinutes: 62, exerciseCount: 5, xp: 90 }],
  recentPrs: [{ exerciseId: 'bench', exerciseName: 'Bench Press', metricType: 'E1RM', bestValue: 111, bestWeightKg: 90, bestReps: 7, achievedAt: measuredAt }],
  leaderboard: [
    { rank: 1, userId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 110, isCurrentUser: false },
    { rank: 2, userId: profile.id, username: profile.username, displayName: profile.displayName, profilePictureUrl: null, xp: 90, isCurrentUser: true },
  ],
  consistency: {
    currentWeekStart: '2026-08-24', currentWeekTarget: 4, currentWeekLiftingDays: 2,
    currentCompletedWeekStreak: 2, bestCompletedWeekStreak: 3, completedWeeks: 4, goalsHit: 3,
    recentWeeks: [{ weekStart: '2026-08-17', target: 4, liftingDays: 4, achieved: true }],
    badges: [{ badgeKey: 'GOAL_STREAK_2', earnedAt: measuredAt }],
  },
};

const exerciseCatalog: ExercisePickerItem[] = presetWorkoutById('FULL_BODY').exerciseNames.map((canonicalName, index) => ({
  id: `exercise-${index + 1}`, canonicalName, measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'OTHER', workoutType: 'OTHER', aliases: [], lastUsedAt: null,
}));

const settingsService = { load: async () => profile, update: async () => profile } satisfies SettingsService;
const deletionService = { request: async () => 'DELETE stefan', cancel: async () => undefined, confirm: async () => undefined } satisfies AccountDeletionService;
const accountSecurityService = { changePassword: async () => undefined } satisfies AccountSecurityService;
const groupService = {
  listGroups: async () => [group],
  listPendingInvites: async () => [],
} as unknown as GroupService;
const profilePictureService = {
  get: async () => ({ path: null, url: null }),
  getPublicUrl: () => null,
} as unknown as ProfilePictureService;
const pwaSnapshot: PwaSnapshot = {
  online: true, standalone: false, platform: 'other', installAvailable: false, manualInstallAvailable: false,
  updateAvailable: false, applyingUpdate: false, serviceWorkerError: false, storagePersistence: 'persistent', storagePersistenceRequestAvailable: false,
};
const pwaService = {
  getSnapshot: () => pwaSnapshot, subscribe: () => () => undefined, start: () => () => undefined,
  requestInstall: async () => 'unavailable' as const, requestPersistentStorage: async () => 'persistent' as const,
  applyUpdate: () => false,
} satisfies PwaService;
const notificationPreferences: NotificationPreferences = {
  notificationsEnabled: true, workoutReminders: false, weeklyGoalReminders: false, badgeAchievements: true,
  personalRecordAlerts: true, groupActivity: false, groupInvitations: true,
};
const notificationPreferenceService = {
  load: async () => notificationPreferences, update: async (next: NotificationPreferences) => next,
} satisfies NotificationPreferenceService;
const pushNotificationService = {
  inspect: async () => ({ capability: 'available' as const, permission: 'granted' as const, subscribed: true, activeDeviceCount: 1 }),
  enable: async () => ({ capability: 'available' as const, permission: 'granted' as const, subscribed: true, activeDeviceCount: 1 }),
  disable: async () => ({ capability: 'available' as const, permission: 'granted' as const, subscribed: false, activeDeviceCount: 0 }),
  sendTest: async () => undefined,
} satisfies PushNotificationService;
const platformAccess: PlatformAccessService = { load: async () => ({ accountStatus: 'ACTIVE', isPlatformAdmin: true }) };

const createdAt = '2026-08-23T12:00:00.000Z';
const target = { userId: 'target-id', username: 'target', displayName: 'Target User' };
const moderationDirectory: ModerationCaseDirectoryPage = {
  page: 1, pageSize: 25, total: 1,
  items: [{
    caseId: 'case-id', reportId: 'report-id', status: 'NEW', category: 'HARASSMENT', reasonExcerpt: 'Repeated unwanted contact.',
    reporter: { userId: 'reporter-id', username: 'reporter', displayName: 'Reporter' }, target,
    referenceType: 'GROUP', referenceLabel: 'Training Friends', assignedTo: null, createdAt, updatedAt: createdAt, closedAt: null,
  }],
};
const moderationRecord: ModerationCaseRecord = {
  detail: {
    ...moderationDirectory.items[0]!, reason: 'Repeated unwanted contact in the training group.', referenceGroupId: 'group-id',
    referenceId: null, assignedAt: null, resolutionReason: null, retentionUntil: null,
  },
  notes: [], events: [{
    eventId: 'event-id', actor: moderationDirectory.items[0]!.reporter, action: 'REPORT_SUBMITTED', reason: null,
    beforeState: {}, afterState: { status: 'NEW' }, createdAt,
  }],
};

const messagingService: PlatformMessagingService = {
  searchUsers: async () => [], searchGroups: async () => [],
  preview: async () => ({ previewId: 'preview-1', audienceType: 'ALL', audienceLabel: 'All eligible users', recipientCount: 8, confirmationPhrase: 'SEND TO 8 USERS', expiresAt: measuredAt }),
  send: async () => 'message-1', list: async () => ({ items: [], total: 0 }), edit: async () => undefined, withdraw: async () => undefined,
};

function AdminShell({ section, title, children }: { section: 'capacity' | 'users' | 'moderation' | 'messages'; title: string; children: ReactNode }) {
  return <PlatformAdminShell activeSection={section} mobileTitle={title} onBackToApp={() => undefined} onNavigate={() => undefined}>{children}</PlatformAdminShell>;
}

function Fixture() {
  const surface = new URLSearchParams(window.location.search).get('surface') ?? 'dashboard';
  document.body.dataset.releaseVisualAuditSurface = surface;

  if (surface === 'auth-signup') return <AuthLayout description="Set up your account. Your training profile comes next." title="Create account"><SignUpForm busy={false} onBack={() => undefined} onSubmit={async () => undefined} /></AuthLayout>;
  if (surface === 'auth-forgot') return <AuthLayout description="Enter your email and we’ll send recovery instructions." eyebrow="ACCOUNT RECOVERY" title="Reset password"><ForgotPasswordForm busy={false} message="" onBack={() => undefined} onSubmit={async () => undefined} /></AuthLayout>;
  if (surface === 'auth-verify') return <AuthLayout description="We sent a confirmation link so we can verify the address belongs to you." eyebrow="VERIFY EMAIL" title="Check your email"><VerifyEmailPanel email="stefan@example.com" onBackToSignIn={() => undefined} /></AuthLayout>;
  if (surface === 'privacy') return <PrivacyPolicyPage />;
  if (surface === 'dashboard') return <DashboardScreen group={group} onNavigate={() => undefined} onSignOut={() => undefined} profile={profile} snapshot={dashboard} />;
  if (surface === 'dashboard-solo') return <DashboardScreen group={null} groupNotice={<section aria-label="Group status">Groups are optional.</section>} onNavigate={() => undefined} onSignOut={() => undefined} profile={profile} snapshot={{ ...dashboard, leaderboard: [] }} />;
  if (surface === 'lift-start') return <WorkoutPresetStartScreen busyAction={null} error="" exerciseCatalog={exerciseCatalog} exercisePickerError="" exercisePickerStatus="ready" onNavigate={() => undefined} onRetryExercisePicker={async () => exerciseCatalog} onSignOut={() => undefined} onStart={async () => null} onStartPreset={async () => null} profile={profile} />;
  if (surface === 'groups-empty') return <OptionalGroupSetupScreen activeItem="groups" busyAction={null} createError="" creating={false} inviteError="" inviteStatus="ready" onAcceptInvite={() => undefined} onCreate={() => undefined} onDeclineInvite={() => undefined} onNavigate={() => undefined} onRetryInvites={() => undefined} onSignOut={() => undefined} pendingInvites={[]} profile={profile} />;
  if (surface === 'settings') return <SettingsScreen accountSecurityService={accountSecurityService} accessService={platformAccess} deletionService={deletionService} groupService={groupService} memberSince="2026-08-18T00:00:00.000Z" notificationPreferenceService={notificationPreferenceService} profile={profile} profilePictureService={profilePictureService} pushNotificationService={pushNotificationService} pwaService={pwaService} settingsService={settingsService} userEmail="stefan@example.com" />;
  if (surface === 'admin-moderation') return <AdminShell section="moderation" title="Moderation"><ModerationWorkspaceScreen actionBusy={false} actionError="" activity={null} activityAccess={null} activityError="" activityLoading={false} activityTypes={['ACCOUNT', 'WORKOUT', 'GROUP_MEMBERSHIP', 'GROUP_ACTIVITY', 'REPORT', 'COMMUNICATION'] as ModerationActivityType[]} currentUserId="admin-id" detailError="" detailLoading={false} directReview={false} directory={moderationDirectory} directoryError="" directoryLoading={false} notice="" onAddNote={async () => true} onAssignSelf={async () => true} onBeginActivityReview={async () => true} onChangePage={() => undefined} onChangeStatus={() => undefined} onClearSelection={() => undefined} onLoadMoreActivity={() => undefined} onOpenCase={() => undefined} onRetryDetail={() => undefined} onRetryDirectory={() => undefined} onUpdateStatus={async () => true} page={1} record={moderationRecord} reviewSubjectId="target-id" selectedCaseId="case-id" status={null} /></AdminShell>;
  if (surface === 'admin-messages') return <AdminShell section="messages" title="Messages"><PlatformMessagingController service={messagingService} /></AdminShell>;

  return <DashboardScreen group={group} onNavigate={() => undefined} onSignOut={() => undefined} profile={profile} snapshot={dashboard} />;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
