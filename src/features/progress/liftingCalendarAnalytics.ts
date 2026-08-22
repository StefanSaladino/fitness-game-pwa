import type { LiftingCalendarPeriodKind, LiftingCalendarSummary } from './model';

export interface LiftingCalendarDelta {
  completedLiftingSessions: number | null;
  exerciseCount: number | null;
  completedWorkingSets: number | null;
  volumeKgReps: number | null;
  prCount: number | null;
}

export interface LiftingCalendarAnalytics {
  weekly: LiftingCalendarSummary[];
  monthly: LiftingCalendarSummary[];
  currentWeek: LiftingCalendarSummary | null;
  previousWeek: LiftingCalendarSummary | null;
  currentMonth: LiftingCalendarSummary | null;
  previousMonth: LiftingCalendarSummary | null;
  weekDelta: LiftingCalendarDelta;
  monthDelta: LiftingCalendarDelta;
}

function byPeriodStart(left: LiftingCalendarSummary, right: LiftingCalendarSummary): number {
  return left.periodStart.localeCompare(right.periodStart);
}

function periodRows(rows: readonly LiftingCalendarSummary[], kind: LiftingCalendarPeriodKind): LiftingCalendarSummary[] {
  return rows.filter((row) => row.periodKind === kind).sort(byPeriodStart);
}

function delta(
  current: LiftingCalendarSummary | null,
  previous: LiftingCalendarSummary | null,
): LiftingCalendarDelta {
  if (!current || !previous) {
    return {
      completedLiftingSessions: null,
      exerciseCount: null,
      completedWorkingSets: null,
      volumeKgReps: null,
      prCount: null,
    };
  }

  return {
    completedLiftingSessions: current.completedLiftingSessions - previous.completedLiftingSessions,
    exerciseCount: current.exerciseCount - previous.exerciseCount,
    completedWorkingSets: current.completedWorkingSets - previous.completedWorkingSets,
    volumeKgReps: current.volumeKgReps - previous.volumeKgReps,
    prCount: current.prCount - previous.prCount,
  };
}

export function buildLiftingCalendarAnalytics(
  rows: readonly LiftingCalendarSummary[],
): LiftingCalendarAnalytics {
  const weekly = periodRows(rows, 'WEEK');
  const monthly = periodRows(rows, 'MONTH');
  const currentWeek = weekly.at(-1) ?? null;
  const previousWeek = weekly.at(-2) ?? null;
  const currentMonth = monthly.at(-1) ?? null;
  const previousMonth = monthly.at(-2) ?? null;

  return {
    weekly,
    monthly,
    currentWeek,
    previousWeek,
    currentMonth,
    previousMonth,
    weekDelta: delta(currentWeek, previousWeek),
    monthDelta: delta(currentMonth, previousMonth),
  };
}
