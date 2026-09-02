import firstPr from '../../assets/badges/first-pr.svg';
import pr5 from '../../assets/badges/pr-5.svg';
import pr10 from '../../assets/badges/pr-10.svg';
import pr25 from '../../assets/badges/pr-25.svg';
import liftDays5 from '../../assets/badges/lift-days-5.svg';
import liftDays10 from '../../assets/badges/lift-days-10.svg';
import liftDays25 from '../../assets/badges/lift-days-25.svg';
import liftDays50 from '../../assets/badges/lift-days-50.svg';
import goalWeek1 from '../../assets/badges/goal-week-1.svg';
import goalStreak2 from '../../assets/badges/goal-streak-2.svg';
import goalStreak4 from '../../assets/badges/goal-streak-4.svg';
import goalStreak8 from '../../assets/badges/goal-streak-8.svg';
import cardioBonusDays5 from '../../assets/badges/cardio-bonus-days-5.svg';
import cardioBonusDays10 from '../../assets/badges/cardio-bonus-days-10.svg';
import type { LiftingBadgeKey } from './model';

const BADGE_ARTWORK = Object.freeze({
  FIRST_PR: firstPr,
  PR_5: pr5,
  PR_10: pr10,
  PR_25: pr25,
  LIFT_DAYS_5: liftDays5,
  LIFT_DAYS_10: liftDays10,
  LIFT_DAYS_25: liftDays25,
  LIFT_DAYS_50: liftDays50,
  GOAL_WEEK_1: goalWeek1,
  GOAL_STREAK_2: goalStreak2,
  GOAL_STREAK_4: goalStreak4,
  GOAL_STREAK_8: goalStreak8,
  CARDIO_BONUS_DAYS_5: cardioBonusDays5,
  CARDIO_BONUS_DAYS_10: cardioBonusDays10,
} satisfies Readonly<Record<LiftingBadgeKey, string>>);

export function liftingBadgeArtwork(key: LiftingBadgeKey): string {
  return BADGE_ARTWORK[key];
}
