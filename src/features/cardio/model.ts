import { CARDIO_BONUS_MIN_ACTIVE_SECONDS, MAX_AUTO_QUALIFY_ACTIVE_SECONDS } from '../../domain/config';
import type { CardioBonusCategory } from '../../domain/types';

export type CardioCategory = CardioBonusCategory;

export interface CardioLogInput {
  category: CardioCategory;
  activeDurationMinutes: number;
  notes?: string;
}

export interface CardioHistoryEntry {
  workoutId: string;
  category: CardioCategory;
  scoringDate: string;
  startedAt: string;
  endedAt: string;
  activeDurationSeconds: number;
  qualifiesCardioBonus: boolean;
  dailyBonusXp: number;
  notes: string | null;
}

export interface CardioSummary {
  totalActivities: number;
  totalActiveMinutes: number;
  last30DaysActivities: number;
  last30DaysActiveMinutes: number;
  last30DaysBonusXp: number;
  lastActivityAt: string | null;
}

export interface CardioSnapshot {
  summary: CardioSummary;
  history: CardioHistoryEntry[];
}

export const CARDIO_CATEGORIES: readonly CardioCategory[] = [
  'RUNNING', 'WALKING_HIKING', 'CYCLING', 'SWIMMING', 'SPORT', 'CARDIO', 'HIIT',
] as const;

export const CARDIO_CATEGORY_LABELS: Readonly<Record<CardioCategory, string>> = Object.freeze({
  RUNNING: 'Running', WALKING_HIKING: 'Walking / hiking', CYCLING: 'Cycling', SWIMMING: 'Swimming',
  SPORT: 'Sport', CARDIO: 'Cardio', HIIT: 'HIIT',
});

export function cardioMinimumMinutes(category: CardioCategory): number {
  return CARDIO_BONUS_MIN_ACTIVE_SECONDS[category] / 60;
}

export function cardioDurationTierXp(category: CardioCategory, activeDurationMinutes: number): number {
  if (!Number.isFinite(activeDurationMinutes) || activeDurationMinutes < cardioMinimumMinutes(category)) return 0;
  if (activeDurationMinutes >= 45) return 15;
  if (activeDurationMinutes >= 30) return 10;
  return 5;
}

export function validateCardioLogInput(input: CardioLogInput): string {
  if (!CARDIO_CATEGORIES.includes(input.category)) return 'Choose a supported cardio activity.';
  if (!Number.isFinite(input.activeDurationMinutes) || !Number.isInteger(input.activeDurationMinutes) || input.activeDurationMinutes < 1) {
    return 'Duration must be a whole number of minutes greater than zero.';
  }
  if (input.activeDurationMinutes * 60 > MAX_AUTO_QUALIFY_ACTIVE_SECONDS) return 'Cardio logs are capped at 6 hours.';
  if ((input.notes ?? '').trim().length > 5000) return 'Notes must be 5,000 characters or fewer.';
  return '';
}
