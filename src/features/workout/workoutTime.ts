import type { ActiveWorkoutSession } from './model';

export function elapsedWorkoutSeconds(
  session: Pick<ActiveWorkoutSession, 'activeDurationSeconds' | 'lastResumedAt' | 'pausedAt'>,
  nowMs: number = Date.now(),
): number {
  const persisted = Math.max(0, Math.floor(session.activeDurationSeconds));

  // A pause RPC persists the accumulated active duration. Some database responses
  // intentionally retain last_resumed_at for auditability, so pausedAt is the
  // authoritative signal that the live wall-clock delta must no longer be added.
  if (session.pausedAt || !session.lastResumedAt) return persisted;

  const resumedMs = Date.parse(session.lastResumedAt);
  if (!Number.isFinite(resumedMs)) return persisted;
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
