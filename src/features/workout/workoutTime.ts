import type { ActiveWorkoutSession } from './model';

export function elapsedWorkoutSeconds(session: Pick<ActiveWorkoutSession, 'activeDurationSeconds' | 'lastResumedAt'>, nowMs: number = Date.now()): number {
  if (!session.lastResumedAt) return Math.max(0, Math.floor(session.activeDurationSeconds));
  const resumedMs = Date.parse(session.lastResumedAt);
  if (!Number.isFinite(resumedMs)) return Math.max(0, Math.floor(session.activeDurationSeconds));
  return Math.max(0, Math.floor(session.activeDurationSeconds + (nowMs - resumedMs) / 1000));
}

export function formatWorkoutDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;
  if (hours > 0) return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
  return [minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}
