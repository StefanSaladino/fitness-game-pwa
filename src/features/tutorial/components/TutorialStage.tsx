import type { ReactNode } from 'react';
import type { DashboardSnapshot } from '../../dashboard/model';
import { DashboardScreen } from '../../dashboard/components/DashboardScreen';
import {
  OptionalGroupSetupScreen,
  type GroupService,
  type GroupSummary,
} from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { ExerciseProgressScreen } from '../../progress/components/ExerciseProgressScreen';
import { buildExerciseAnalytics } from '../../progress/exerciseAnalytics';
import { buildLiftingCalendarAnalytics } from '../../progress/liftingCalendarAnalytics';
import type {
  ExerciseProgressHistoryEntry,
  ExerciseProgressSummary,
  LiftingCalendarSummary,
  MuscleVolumeSummary,
} from '../../progress/model';
import {
  GlobalAllTimeLeaderboardScreen,
  type GlobalAllTimeLeaderboard,
} from '../../social';
import { SettingsScreen } from '../../settings/SettingsScreen';
import type { AccountDeletionService } from '../../settings/accountDeletionService';
import type { AccountSecurityService } from '../../settings/accountSecurityService';
import type {
  NotificationPreferenceService,
  NotificationPreferences,
} from '../../settings/notificationPreferenceService';
import type { SettingsService } from '../../settings/settingsService';
import type { TrainingProgramProfileService } from '../../settings/trainingProgramProfileService';
import type { ProfilePictureService } from '../../profile-picture/profilePictureService';
import type { PwaService, PwaSnapshot } from '../../../pwa/pwaService';
import type { PushNotificationService } from '../../../pwa/pushNotificationService';
import type { PlatformAccessService } from '../../admin/platformAccessService';
import {
  WorkoutPresetStartScreen,
} from '../../workout/components/WorkoutPresetStartScreen';
import type { ExercisePickerItem } from '../../workout/model';
import { presetWorkouts } from '../../workout/presetWorkouts';
import type { TrainingProgramGeneratorCandidate } from '../../../domain/trainingProgramGenerator';
import type { TrainingProgramDefinition } from '../../../domain/trainingProgram';
import {
  TrainingProgramController,
  type TrainingProgramControllerServices,
} from '../../training-program/components/TrainingProgramController';

export type TutorialStageId =
  | 'HOME'
  | 'LIFT'
  | 'PROGRAM'
  | 'PROGRESS'
  | 'GROUPS'
  | 'COMPETE'
  | 'SETTINGS';

const measuredAt = '2026-09-25T12:00:00.000Z';

export const tutorialProfile: OnboardingProfile = {
  id: 'tutorial-demo-user',
  username: 'demo_athlete',
  displayName: 'Demo Athlete',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: measuredAt,
  profileCode: 'DEMO-0000000000',
  preferredWeightUnit: 'KG',
  tutorialCompletedVersion: 1,
};

const tutorialGroup: GroupSummary = {
  id: 'tutorial-group',
  name: 'Demo Crew',
  memberCount: 3,
  role: 'OWNER',
  joinedAt: measuredAt,
  createdAt: measuredAt,
};

const dashboardSnapshot: DashboardSnapshot = {
  weekStart: '2026-09-21',
  weekEnd: '2026-09-27',
  weeklyTarget: 4,
  completedLiftingDays: 2,
  completedLiftingDates: ['2026-09-21', '2026-09-23'],
  weeklyXp: 132,
  xpBreakdown: {
    workout: 70,
    exercises: 32,
    progression: 20,
    cardio: 10,
  },
  currentUserProfilePictureUrl: null,
  recentLifts: [
    {
      id: 'tutorial-lift-1',
      title: 'Upper Strength',
      scoringDate: '2026-09-23',
      startedAt: measuredAt,
      durationMinutes: 61,
      exerciseCount: 6,
      xp: 76,
    },
    {
      id: 'tutorial-lift-2',
      title: 'Lower Strength',
      scoringDate: '2026-09-21',
      startedAt: measuredAt,
      durationMinutes: 58,
      exerciseCount: 5,
      xp: 56,
    },
  ],
  recentPrs: [
    {
      exerciseId: 'tutorial-bench',
      exerciseName: 'Bench Press',
      metricType: 'E1RM',
      bestValue: 108,
      bestWeightKg: 90,
      bestReps: 6,
      achievedAt: measuredAt,
    },
  ],
  leaderboard: [
    {
      rank: 1,
      userId: tutorialProfile.id,
      username: tutorialProfile.username,
      displayName: tutorialProfile.displayName,
      profilePictureUrl: null,
      xp: 132,
      isCurrentUser: true,
    },
    {
      rank: 2,
      userId: 'tutorial-athlete-2',
      username: 'sample_lifter',
      displayName: 'Sample Lifter',
      profilePictureUrl: null,
      xp: 118,
      isCurrentUser: false,
    },
  ],
  consistency: {
    currentWeekStart: '2026-09-21',
    currentWeekTarget: 4,
    currentWeekLiftingDays: 2,
    currentCompletedWeekStreak: 3,
    bestCompletedWeekStreak: 5,
    completedWeeks: 8,
    goalsHit: 6,
    recentWeeks: [
      {
        weekStart: '2026-09-14',
        target: 4,
        liftingDays: 4,
        achieved: true,
      },
    ],
    badges: [
      {
        badgeKey: 'GOAL_STREAK_2',
        earnedAt: measuredAt,
      },
    ],
  },
};

const exerciseCatalog: ExercisePickerItem[] = Array.from(
  new Set(presetWorkouts.flatMap((preset) => preset.exerciseNames)),
).map((canonicalName, index) => ({
  id: `tutorial-exercise-${index + 1}`,
  canonicalName,
  measurementType: 'WEIGHT_REPS',
  primaryMuscleGroup: 'OTHER',
  workoutType: 'OTHER',
  aliases: [],
  lastUsedAt: null,
}));

const benchProgress: ExerciseProgressSummary = {
  exerciseId: 'tutorial-bench',
  canonicalName: 'Barbell Bench Press',
  measurementType: 'WEIGHT_REPS',
  metricType: 'E1RM',
  bestValue: 108,
  bestWeightKg: 90,
  bestReps: 6,
  achievedAt: measuredAt,
  previousPrValue: 104,
  sessionCount: 4,
  observationCount: 4,
  firstPerformedAt: '2026-09-01T12:00:00.000Z',
  lastPerformedAt: measuredAt,
  averageDaysBetweenSessions: 6,
  latestMetricValue: 108,
  latestWeightKg: 90,
  latestReps: 6,
  latestObservedAt: measuredAt,
};

const progressHistory: ExerciseProgressHistoryEntry[] = [
  {
    workoutId: 'tutorial-progress-1',
    scoringDate: '2026-09-01',
    observedAt: '2026-09-01T12:00:00.000Z',
    metricType: 'E1RM',
    metricValue: 96,
    weightKg: 80,
    reps: 6,
    previousPrValue: null,
    isBaseline: true,
    isPr: false,
    isCurrentPr: false,
    completedWorkingSets: 3,
    sessionVolumeKgReps: 1400,
    heaviestWeightKg: 82.5,
    maxCompletedReps: 8,
    plainBodyweightSets: 0,
    addedWeightSets: 0,
    assistedSets: 0,
  },
  {
    workoutId: 'tutorial-progress-2',
    scoringDate: '2026-09-23',
    observedAt: measuredAt,
    metricType: 'E1RM',
    metricValue: 108,
    weightKg: 90,
    reps: 6,
    previousPrValue: 104,
    isBaseline: false,
    isPr: true,
    isCurrentPr: true,
    completedWorkingSets: 4,
    sessionVolumeKgReps: 1860,
    heaviestWeightKg: 90,
    maxCompletedReps: 7,
    plainBodyweightSets: 0,
    addedWeightSets: 0,
    assistedSets: 0,
  },
];

const calendarSummaries: LiftingCalendarSummary[] = [
  {
    periodKind: 'WEEK',
    periodStart: '2026-09-07',
    periodEnd: '2026-09-13',
    completedLiftingSessions: 3,
    exerciseCount: 7,
    completedWorkingSets: 28,
    volumeKgReps: 11800,
    prCount: 1,
  },
  {
    periodKind: 'WEEK',
    periodStart: '2026-09-14',
    periodEnd: '2026-09-20',
    completedLiftingSessions: 4,
    exerciseCount: 8,
    completedWorkingSets: 35,
    volumeKgReps: 14300,
    prCount: 2,
  },
  {
    periodKind: 'WEEK',
    periodStart: '2026-09-21',
    periodEnd: '2026-09-27',
    completedLiftingSessions: 2,
    exerciseCount: 6,
    completedWorkingSets: 21,
    volumeKgReps: 9200,
    prCount: 1,
  },
];

const globalLeaderboard: GlobalAllTimeLeaderboard = {
  top10: [
    {
      rank: 1,
      userId: 'tutorial-global-1',
      username: 'sample_one',
      displayName: 'Sample Athlete',
      profilePictureUrl: null,
      xp: 1520,
      liftingDays: 31,
      prCount: 12,
      badgeCount: 8,
      isCurrentUser: false,
    },
    {
      rank: 2,
      userId: tutorialProfile.id,
      username: tutorialProfile.username,
      displayName: tutorialProfile.displayName,
      profilePictureUrl: null,
      xp: 1380,
      liftingDays: 27,
      prCount: 9,
      badgeCount: 7,
      isCurrentUser: true,
    },
    {
      rank: 3,
      userId: 'tutorial-global-3',
      username: 'sample_three',
      displayName: 'Training Partner',
      profilePictureUrl: null,
      xp: 1240,
      liftingDays: 24,
      prCount: 8,
      badgeCount: 6,
      isCurrentUser: false,
    },
  ],
  currentUser: {
    rank: 2,
    userId: tutorialProfile.id,
    username: tutorialProfile.username,
    displayName: tutorialProfile.displayName,
    profilePictureUrl: null,
    xp: 1380,
    liftingDays: 27,
    prCount: 9,
    badgeCount: 7,
    isCurrentUser: true,
  },
};

const programCandidate: TrainingProgramGeneratorCandidate = {
  exerciseId: 'tutorial-bench',
  canonicalName: 'Bench Press',
  measurementType: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  workoutType: 'BARBELL',
  supportsAddedWeight: false,
  supportsAssisted: false,
  volumeEligible: true,
  contributions: [
    {
      muscleGroup: 'CHEST',
      role: 'DIRECT',
      weight: 1,
    },
  ],
};

const chestVolume: MuscleVolumeSummary = {
  muscleGroup: 'CHEST',
  windowDays: 7,
  windowStart: '2026-09-18',
  windowEnd: '2026-09-24',
  methodologyVersion: 'muscle-volume-v2',
  effectiveSets: 10,
  directEffectiveSets: 10,
  indirectEffectiveSets: 0,
  eligibleLogicalSets: 10,
  eligibleStages: 10,
  reviewFlaggedLogicalSets: 0,
  targetMin: 8,
  targetMidpoint: 10,
  targetMax: 12,
  highReviewAbove: 14,
  volumeStatus: 'ON_TARGET',
  benchmarkEvidenceConfidence: 'HIGH',
  highConfidenceEffectiveSets: 10,
  mediumConfidenceEffectiveSets: 0,
  lowOrProvisionalEffectiveSets: 0,
  provisionalEffectiveSets: 0,
  highConfidenceProportion: 1,
  mediumConfidenceProportion: 0,
  lowOrProvisionalProportion: 0,
};

function generatedProgram(): TrainingProgramDefinition {
  return {
    version: 'training-program-v1',
    goal: 'BALANCED',
    weeks: 4,
    sessionsPerWeek: 3,
    source: {
      generatorVersion: 'training-program-v1',
      generatedAt: measuredAt,
      historyThroughDate: '2026-09-24',
      muscleVolumeMethodologyVersion: 'muscle-volume-v2',
      profileRevision: 1,
      constraintRevision: 0,
      durationWeeks: 4,
      startDate: '2026-09-28',
      trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
      requestedSplit: 'AUTO',
      resolvedSplit: 'FULL_BODY',
    },
    workouts: [],
  };
}

const programServices = {
  profile: {
    load: async () => ({
      userId: tutorialProfile.id,
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      goal: 'BALANCED',
      sessionsPerWeek: 3,
      revision: 1,
      createdAt: measuredAt,
      updatedAt: measuredAt,
    }),
    updatePreferences: async (input: {
      goal: 'STRENGTH' | 'HYPERTROPHY' | 'BALANCED';
      sessionsPerWeek: number;
      expectedRevision: number;
    }) => ({
      userId: tutorialProfile.id,
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      goal: input.goal,
      sessionsPerWeek: input.sessionsPerWeek,
      revision: input.expectedRevision + 1,
      createdAt: measuredAt,
      updatedAt: measuredAt,
    }),
  },
  constraints: {
    load: async () => ({ revision: 0, entries: [] }),
    replace: async (input: {
      expectedRevision: number;
      entries: unknown[];
    }) => ({
      revision: input.expectedRevision + 1,
      entries: input.entries,
    }),
  },
  candidates: {
    load: async () => [programCandidate],
  },
  progress: {
    listOverview: async () => [],
    loadCalendarSummaries: async () => [],
    loadHistory: async () => [],
    loadMuscleVolume: async () => [chestVolume],
  },
  performance: {
    loadObservations: async () => [],
  },
  personalVolume: {
    load: async () => [],
  },
  generator: {
    generate: async () => generatedProgram(),
  },
  adaptation: {
    adapt: async () => ({
      adaptationId: 'tutorial-adaptation',
      outcome: 'NO_CHANGE',
      sourceProgramRevision: 1,
      resultingProgramRevision: 1,
      changeCount: 0,
      alreadyApplied: false,
    }),
  },
  product: {
    list: async () => [],
    load: async () => {
      throw new Error('Tutorial fixture has no saved Program.');
    },
    create: async () => 'tutorial-program',
    setStatus: async () => ({
      programId: 'tutorial-program',
      status: 'DRAFT',
      revision: 1,
    }),
    launchProgrammedWorkout: async () => ({
      workoutSessionId: 'tutorial-session',
      programWorkoutId: 'tutorial-workout',
      programExecutionStatus: 'STARTED_PROGRAMMED',
    }),
    launchOwnWorkout: async () => ({
      workoutSessionId: 'tutorial-session-own',
      programWorkoutId: 'tutorial-workout',
      programExecutionStatus: 'STARTED_OWN_WORKOUT',
    }),
    markMissed: async () => undefined,
    replaceExercise: async () => {
      throw new Error('Tutorial fixture does not mutate Programs.');
    },
    updateWorkoutVolume: async () => ({
      programId: 'tutorial-program',
      programWorkoutId: 'tutorial-workout',
      programRevision: 1,
      workoutRevision: 1,
      beforeTotalWorkingSets: 9,
      afterTotalWorkingSets: 9,
      changed: false,
    }),
  },
} as unknown as TrainingProgramControllerServices;

const settingsService = {
  load: async () => tutorialProfile,
  update: async () => tutorialProfile,
} as unknown as SettingsService;

const accountSecurityService = {
  changePassword: async () => undefined,
} as unknown as AccountSecurityService;

const deletionService = {
  request: async () => 'DELETE demo_athlete',
  cancel: async () => undefined,
  confirm: async () => undefined,
} as unknown as AccountDeletionService;

const groupService = {
  listGroups: async () => [tutorialGroup],
  listPendingInvites: async () => [],
} as unknown as GroupService;

const profilePictureService = {
  get: async () => ({ path: null, url: null }),
  getPublicUrl: () => null,
} as unknown as ProfilePictureService;

const pwaSnapshot: PwaSnapshot = {
  online: true,
  standalone: false,
  platform: 'other',
  installAvailable: false,
  manualInstallAvailable: false,
  updateAvailable: false,
  applyingUpdate: false,
  serviceWorkerError: false,
  storagePersistence: 'persistent',
  storagePersistenceRequestAvailable: false,
};

const pwaService = {
  getSnapshot: () => pwaSnapshot,
  subscribe: () => () => undefined,
  start: () => () => undefined,
  requestInstall: async () => 'unavailable' as const,
  requestPersistentStorage: async () => 'persistent' as const,
  applyUpdate: () => false,
} as unknown as PwaService;

const notificationPreferences: NotificationPreferences = {
  notificationsEnabled: true,
  workoutReminders: true,
  weeklyGoalReminders: true,
  badgeAchievements: true,
  personalRecordAlerts: true,
  groupActivity: false,
  groupInvitations: true,
};

const notificationPreferenceService = {
  load: async () => notificationPreferences,
  update: async (next: NotificationPreferences) => next,
} as unknown as NotificationPreferenceService;

const pushNotificationService = {
  inspect: async () => ({
    capability: 'available' as const,
    permission: 'granted' as const,
    subscribed: true,
    activeDeviceCount: 1,
  }),
  enable: async () => ({
    capability: 'available' as const,
    permission: 'granted' as const,
    subscribed: true,
    activeDeviceCount: 1,
  }),
  disable: async () => ({
    capability: 'available' as const,
    permission: 'granted' as const,
    subscribed: false,
    activeDeviceCount: 0,
  }),
  sendTest: async () => undefined,
} as unknown as PushNotificationService;

const trainingProgramProfileService = {
  load: async () => ({
    userId: tutorialProfile.id,
    accessMode: 'COMMERCIAL_GYM',
    equipmentKeys: [],
    revision: 1,
    createdAt: measuredAt,
    updatedAt: measuredAt,
  }),
  update: async () => ({
    userId: tutorialProfile.id,
    accessMode: 'COMMERCIAL_GYM',
    equipmentKeys: [],
    revision: 2,
    createdAt: measuredAt,
    updatedAt: measuredAt,
  }),
} as unknown as TrainingProgramProfileService;

const platformAccess: PlatformAccessService = {
  load: async () => ({
    accountStatus: 'ACTIVE',
    isPlatformAdmin: false,
  }),
};

function noopNavigate() {
  // Tutorial screens are display-only; the coach owns navigation.
}

function StageFrame({ children }: { children: ReactNode }) {
  return (
    <div data-tutorial-stage aria-hidden="true">
      {children}
    </div>
  );
}

export function TutorialStage({ stage }: { stage: TutorialStageId }) {
  if (stage === 'HOME') {
    return (
      <StageFrame>
        <DashboardScreen
          group={tutorialGroup}
          onNavigate={noopNavigate}
          onSignOut={() => undefined}
          profile={tutorialProfile}
          snapshot={dashboardSnapshot}
        />
      </StageFrame>
    );
  }

  if (stage === 'LIFT') {
    return (
      <StageFrame>
        <WorkoutPresetStartScreen
          busyAction={null}
          error=""
          exerciseCatalog={exerciseCatalog}
          exercisePickerError=""
          exercisePickerStatus="ready"
          history={[]}
          historyError=""
          historyStatus="ready"
          onNavigate={noopNavigate}
          onRetryExercisePicker={async () => exerciseCatalog}
          onRetryHistory={() => undefined}
          onSignOut={() => undefined}
          onStart={async () => undefined}
          onStartPreset={async () => undefined}
          profile={tutorialProfile}
        />
      </StageFrame>
    );
  }

  if (stage === 'PROGRAM') {
    return (
      <StageFrame>
        <TrainingProgramController
          onNavigate={noopNavigate}
          onSignOut={() => undefined}
          profile={tutorialProfile}
          services={programServices}
        />
      </StageFrame>
    );
  }

  if (stage === 'PROGRESS') {
    return (
      <StageFrame>
        <ExerciseProgressScreen
          analytics={buildExerciseAnalytics(benchProgress, progressHistory)}
          calendarAnalytics={buildLiftingCalendarAnalytics(calendarSummaries)}
          calendarError=""
          calendarStatus="ready"
          exercises={[benchProgress]}
          history={progressHistory}
          historyError=""
          historyStatus="ready"
          onNavigate={noopNavigate}
          onOpenTrainingVolume={() => undefined}
          onRetryCalendar={() => undefined}
          onRetryHistory={() => undefined}
          onSelectExercise={() => undefined}
          onSignOut={() => undefined}
          profile={tutorialProfile}
          selectedExercise={benchProgress}
        />
      </StageFrame>
    );
  }

  if (stage === 'GROUPS') {
    return (
      <StageFrame>
        <OptionalGroupSetupScreen
          activeItem="groups"
          busyAction={null}
          createError=""
          creating={false}
          inviteError=""
          inviteStatus="ready"
          onAcceptInvite={() => undefined}
          onCreate={() => undefined}
          onDeclineInvite={() => undefined}
          onNavigate={noopNavigate}
          onRetryInvites={() => undefined}
          onSignOut={() => undefined}
          pendingInvites={[]}
          profile={tutorialProfile}
        />
      </StageFrame>
    );
  }

  if (stage === 'COMPETE') {
    return (
      <StageFrame>
        <GlobalAllTimeLeaderboardScreen
          hasGroup
          leaderboard={globalLeaderboard}
          onNavigate={noopNavigate}
          onShowGroup={() => undefined}
          onSignOut={() => undefined}
          profile={tutorialProfile}
        />
      </StageFrame>
    );
  }

  return (
    <StageFrame>
      <SettingsScreen
        accountSecurityService={accountSecurityService}
        accessService={platformAccess}
        deletionService={deletionService}
        groupService={groupService}
        memberSince={measuredAt}
        notificationPreferenceService={notificationPreferenceService}
        profile={tutorialProfile}
        profilePictureService={profilePictureService}
        pushNotificationService={pushNotificationService}
        pwaService={pwaService}
        settingsService={settingsService}
        trainingProgramProfileService={trainingProgramProfileService}
        userEmail="demo@example.invalid"
      />
    </StageFrame>
  );
}
