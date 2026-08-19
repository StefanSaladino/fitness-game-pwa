export type DashboardXpEventType = 'LIFTING_WORKOUT' | 'EXERCISE_COMPLETE' | 'EXERCISE_PROGRESS' | 'CARDIO_BONUS';

export interface DashboardXpBreakdown {
  workout: number;
  exercises: number;
  progression: number;
  cardio: number;
}

export interface DashboardRecentLift {
  id: string;
  title: string;
  scoringDate: string;
  startedAt: string;
  durationMinutes: number;
  exerciseCount: number;
  xp: number;
}

export type DashboardPrMetric = 'E1RM' | 'BODYWEIGHT_REPS';

export interface DashboardRecentPr {
  exerciseId: string;
  exerciseName: string;
  metricType: DashboardPrMetric;
  bestValue: number;
  bestWeightKg: number | null;
  bestReps: number | null;
  achievedAt: string;
}

export interface DashboardLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  xp: number;
  isCurrentUser: boolean;
}

export interface DashboardSnapshot {
  weekStart: string;
  weekEnd: string;
  weeklyTarget: number;
  completedLiftingDays: number;
  completedLiftingDates: string[];
  weeklyXp: number;
  xpBreakdown: DashboardXpBreakdown;
  recentLifts: DashboardRecentLift[];
  recentPrs: DashboardRecentPr[];
  leaderboard: DashboardLeaderboardEntry[];
  currentUserProfilePictureUrl: string | null;
}

export interface DashboardLoadInput {
  userId: string;
  timezone: string;
  weeklyTarget: number;
  groupId: string;
}
