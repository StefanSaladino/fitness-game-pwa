import type { LiftingBadgeKey } from '../consistency';

export type GroupCompetitionPeriod = 'WEEK' | 'ALL_TIME';
export type GroupSocialActivityType = 'LIFT' | 'PR' | 'BADGE' | 'GOAL';
export type GroupReactionType = 'FIRE' | 'STRONG' | 'CLAP';

export interface GroupCompetitionEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  xp: number;
  liftingDays: number;
  prCount: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

export interface GroupCompetitionLeaderboard {
  period: GroupCompetitionPeriod;
  periodStart: string | null;
  periodEnd: string | null;
  entries: GroupCompetitionEntry[];
}

export interface LiftActivityMetadata {
  scoringDate: string;
  title: string;
  durationMinutes: number;
  exerciseCount: number;
  xp: number;
}

export interface PrActivityMetadata {
  exerciseName: string;
  metricType: 'E1RM' | 'BODYWEIGHT_REPS';
  metricValue: number;
  previousBest: number;
  weightKg: number | null;
  reps: number | null;
  scoringDate: string;
}

export interface BadgeActivityMetadata { badgeKey: LiftingBadgeKey; }
export interface GoalActivityMetadata { weekStart: string; liftingDays: number; target: number; }
export type GroupSocialActivityMetadata = LiftActivityMetadata | PrActivityMetadata | BadgeActivityMetadata | GoalActivityMetadata;

export interface GroupSocialFeedItem {
  activityKey: string;
  activityType: GroupSocialActivityType;
  activityAt: string;
  actorUserId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  metadata: GroupSocialActivityMetadata;
  reactions: Record<GroupReactionType, number>;
  myReaction: GroupReactionType | null;
}

export interface GroupSocialFeedCursor { activityAt: string; activityKey: string; }
export interface GroupSocialFeedPage { items: GroupSocialFeedItem[]; nextCursor: GroupSocialFeedCursor | null; }
