import type { DashboardXpBreakdown, DashboardXpEventType } from './model';

export interface DashboardScoringEventLike {
  eventType: DashboardXpEventType;
  amount: number;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function scoringDateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  if (!year || !month || !day) throw new Error('Unable to resolve scoring date.');
  return `${year}-${month}-${day}`;
}

export function weekBoundsForScoringDate(scoringDate: string): { weekStart: string; weekEnd: string } {
  const date = new Date(`${scoringDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid scoring date.');

  const isoDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (isoDay - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { weekStart: formatUtcDate(monday), weekEnd: formatUtcDate(sunday) };
}

export function uniqueScoringDayCount(scoringDates: string[]): number {
  return new Set(scoringDates).size;
}

export function summarizeScoringEvents(events: DashboardScoringEventLike[]): {
  weeklyXp: number;
  breakdown: DashboardXpBreakdown;
} {
  const breakdown: DashboardXpBreakdown = { workout: 0, exercises: 0, progression: 0, cardio: 0 };

  for (const event of events) {
    if (!Number.isFinite(event.amount) || event.amount <= 0) continue;
    if (event.eventType === 'LIFTING_WORKOUT') breakdown.workout += event.amount;
    if (event.eventType === 'EXERCISE_COMPLETE') breakdown.exercises += event.amount;
    if (event.eventType === 'EXERCISE_PROGRESS') breakdown.progression += event.amount;
    if (event.eventType === 'CARDIO_BONUS') breakdown.cardio += event.amount;
  }

  return {
    weeklyXp: breakdown.workout + breakdown.exercises + breakdown.progression + breakdown.cardio,
    breakdown,
  };
}
