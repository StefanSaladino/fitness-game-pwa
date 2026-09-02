import { LIFTING_BADGE_KEYS, type LiftingBadgeKey, type LiftingBadgeProgressSnapshot } from './model';

type BadgeProgressMetric = 'PR_COUNT' | 'LIFTING_DAY_COUNT' | 'GOALS_HIT' | 'BEST_COMPLETED_WEEK_STREAK' | 'CARDIO_BONUS_DAY_COUNT';

interface BadgeProgressRule {
  badgeKey: LiftingBadgeKey;
  metric: BadgeProgressMetric;
  required: number;
  unit: 'PR' | 'PRs' | 'lift day' | 'lift days' | 'week' | 'weeks' | 'weekly target' | 'cardio day' | 'cardio days';
  showBar: boolean;
}

export interface LiftingBadgeProgress {
  badgeKey: LiftingBadgeKey;
  current: number;
  required: number;
  remaining: number;
  percent: number;
  label: string;
  showBar: boolean;
}

const RULES: Readonly<Record<LiftingBadgeKey, BadgeProgressRule>> = Object.freeze({
  FIRST_PR: { badgeKey: 'FIRST_PR', metric: 'PR_COUNT', required: 1, unit: 'PR', showBar: false },
  PR_5: { badgeKey: 'PR_5', metric: 'PR_COUNT', required: 5, unit: 'PRs', showBar: true },
  PR_10: { badgeKey: 'PR_10', metric: 'PR_COUNT', required: 10, unit: 'PRs', showBar: true },
  PR_25: { badgeKey: 'PR_25', metric: 'PR_COUNT', required: 25, unit: 'PRs', showBar: true },
  LIFT_DAYS_5: { badgeKey: 'LIFT_DAYS_5', metric: 'LIFTING_DAY_COUNT', required: 5, unit: 'lift days', showBar: true },
  LIFT_DAYS_10: { badgeKey: 'LIFT_DAYS_10', metric: 'LIFTING_DAY_COUNT', required: 10, unit: 'lift days', showBar: true },
  LIFT_DAYS_25: { badgeKey: 'LIFT_DAYS_25', metric: 'LIFTING_DAY_COUNT', required: 25, unit: 'lift days', showBar: true },
  LIFT_DAYS_50: { badgeKey: 'LIFT_DAYS_50', metric: 'LIFTING_DAY_COUNT', required: 50, unit: 'lift days', showBar: true },
  GOAL_WEEK_1: { badgeKey: 'GOAL_WEEK_1', metric: 'GOALS_HIT', required: 1, unit: 'weekly target', showBar: false },
  GOAL_STREAK_2: { badgeKey: 'GOAL_STREAK_2', metric: 'BEST_COMPLETED_WEEK_STREAK', required: 2, unit: 'weeks', showBar: true },
  GOAL_STREAK_4: { badgeKey: 'GOAL_STREAK_4', metric: 'BEST_COMPLETED_WEEK_STREAK', required: 4, unit: 'weeks', showBar: true },
  GOAL_STREAK_8: { badgeKey: 'GOAL_STREAK_8', metric: 'BEST_COMPLETED_WEEK_STREAK', required: 8, unit: 'weeks', showBar: true },
  CARDIO_BONUS_DAYS_5: { badgeKey: 'CARDIO_BONUS_DAYS_5', metric: 'CARDIO_BONUS_DAY_COUNT', required: 5, unit: 'cardio days', showBar: true },
  CARDIO_BONUS_DAYS_10: { badgeKey: 'CARDIO_BONUS_DAYS_10', metric: 'CARDIO_BONUS_DAY_COUNT', required: 10, unit: 'cardio days', showBar: true },
});

function metricValue(snapshot: LiftingBadgeProgressSnapshot, metric: BadgeProgressMetric): number {
  if (metric === 'PR_COUNT') return snapshot.prCount;
  if (metric === 'LIFTING_DAY_COUNT') return snapshot.liftingDayCount;
  if (metric === 'GOALS_HIT') return snapshot.goalsHit;
  if (metric === 'BEST_COMPLETED_WEEK_STREAK') return snapshot.bestCompletedWeekStreak;
  return snapshot.cardioBonusDayCount;
}

function labelFor(rule: BadgeProgressRule, current: number): string {
  if (rule.badgeKey === 'GOAL_WEEK_1') return `${current} / 1 weekly target`;
  return `${current} / ${rule.required} ${rule.unit}`;
}

export function liftingBadgeProgress(snapshot: LiftingBadgeProgressSnapshot, badgeKey: LiftingBadgeKey): LiftingBadgeProgress {
  const rule = RULES[badgeKey];
  const actual = Math.max(0, Math.floor(metricValue(snapshot, rule.metric)));
  const current = Math.min(actual, rule.required);
  const remaining = Math.max(0, rule.required - current);
  const percent = rule.required === 0 ? 100 : Math.min(100, Math.round((current / rule.required) * 100));

  return {
    badgeKey,
    current,
    required: rule.required,
    remaining,
    percent,
    label: labelFor(rule, current),
    showBar: rule.showBar,
  };
}

export function liftingBadgeProgressEntries(snapshot: LiftingBadgeProgressSnapshot): readonly LiftingBadgeProgress[] {
  return LIFTING_BADGE_KEYS.map((badgeKey) => liftingBadgeProgress(snapshot, badgeKey));
}
