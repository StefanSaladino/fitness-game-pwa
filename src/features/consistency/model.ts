export const LIFTING_BADGE_KEYS = [
  'FIRST_PR',
  'PR_5',
  'PR_10',
  'PR_25',
  'LIFT_DAYS_5',
  'LIFT_DAYS_10',
  'LIFT_DAYS_25',
  'LIFT_DAYS_50',
  'GOAL_WEEK_1',
  'GOAL_STREAK_2',
  'GOAL_STREAK_4',
  'GOAL_STREAK_8',
  'CARDIO_BONUS_DAYS_5',
  'CARDIO_BONUS_DAYS_10',
] as const;

export type LiftingBadgeKey = typeof LIFTING_BADGE_KEYS[number];
export type LiftingBadgeCategory = 'PR' | 'LIFTING' | 'CONSISTENCY' | 'CARDIO';

export interface LiftingBadgeDefinition {
  key: LiftingBadgeKey;
  title: string;
  description: string;
  category: LiftingBadgeCategory;
}

export interface EarnedLiftingBadge {
  badgeKey: LiftingBadgeKey;
  earnedAt: string;
}

export interface LiftingBadgeProgressSnapshot {
  prCount: number;
  liftingDayCount: number;
  goalsHit: number;
  bestCompletedWeekStreak: number;
  cardioBonusDayCount: number;
  badges: EarnedLiftingBadge[];
}

export interface WeeklyLiftingSnapshot {
  weekStart: string;
  target: number;
  liftingDays: number;
  achieved: boolean;
}

export interface LiftingConsistencySummary {
  currentWeekStart: string;
  currentWeekTarget: number;
  currentWeekLiftingDays: number;
  currentCompletedWeekStreak: number;
  bestCompletedWeekStreak: number;
  completedWeeks: number;
  goalsHit: number;
  recentWeeks: WeeklyLiftingSnapshot[];
  badges: EarnedLiftingBadge[];
}
