import { LIFTING_BADGE_KEYS, type LiftingBadgeDefinition, type LiftingBadgeKey } from './model';

const BADGES: Readonly<Record<LiftingBadgeKey, LiftingBadgeDefinition>> = Object.freeze({
  FIRST_PR: { key: 'FIRST_PR', title: 'First PR', description: 'Improved a personal record for the first time.', category: 'PR' },
  PR_5: { key: 'PR_5', title: '5 PRs', description: 'Recorded five personal-record improvements.', category: 'PR' },
  PR_10: { key: 'PR_10', title: '10 PRs', description: 'Recorded ten personal-record improvements.', category: 'PR' },
  PR_25: { key: 'PR_25', title: '25 PRs', description: 'Recorded twenty-five personal-record improvements.', category: 'PR' },
  LIFT_DAYS_5: { key: 'LIFT_DAYS_5', title: '5 Lift Days', description: 'Completed five qualifying lifting days.', category: 'LIFTING' },
  LIFT_DAYS_10: { key: 'LIFT_DAYS_10', title: '10 Lift Days', description: 'Completed ten qualifying lifting days.', category: 'LIFTING' },
  LIFT_DAYS_25: { key: 'LIFT_DAYS_25', title: '25 Lift Days', description: 'Completed twenty-five qualifying lifting days.', category: 'LIFTING' },
  LIFT_DAYS_50: { key: 'LIFT_DAYS_50', title: '50 Lift Days', description: 'Completed fifty qualifying lifting days.', category: 'LIFTING' },
  GOAL_WEEK_1: { key: 'GOAL_WEEK_1', title: 'Target Hit', description: 'Completed a weekly lifting target.', category: 'CONSISTENCY' },
  GOAL_STREAK_2: { key: 'GOAL_STREAK_2', title: '2-Week Streak', description: 'Hit the lifting target for two completed weeks in a row.', category: 'CONSISTENCY' },
  GOAL_STREAK_4: { key: 'GOAL_STREAK_4', title: '4-Week Streak', description: 'Hit the lifting target for four completed weeks in a row.', category: 'CONSISTENCY' },
  GOAL_STREAK_8: { key: 'GOAL_STREAK_8', title: '8-Week Streak', description: 'Hit the lifting target for eight completed weeks in a row.', category: 'CONSISTENCY' },
  CARDIO_BONUS_DAYS_5: { key: 'CARDIO_BONUS_DAYS_5', title: '5 Cardio Bonus Days', description: 'Earned the accessory cardio bonus on five days.', category: 'CARDIO' },
  CARDIO_BONUS_DAYS_10: { key: 'CARDIO_BONUS_DAYS_10', title: '10 Cardio Bonus Days', description: 'Earned the accessory cardio bonus on ten days.', category: 'CARDIO' },
});

const BADGE_LIST = Object.freeze(LIFTING_BADGE_KEYS.map((key) => BADGES[key]));

export function liftingBadgeDefinition(key: LiftingBadgeKey): LiftingBadgeDefinition {
  return BADGES[key];
}

export function liftingBadgeDefinitions(): readonly LiftingBadgeDefinition[] {
  return BADGE_LIST;
}
