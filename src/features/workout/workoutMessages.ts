export function toUserFacingWorkoutError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/authentication required|jwt|not authenticated/i.test(message)) return 'Your session expired. Sign in again to continue.';
  if (/active lifting workout not found/i.test(message)) return 'That workout is no longer active. Refresh to continue.';
  if (/network|fetch|connection/i.test(message)) return 'Could not reach the workout service. Check your connection and try again.';
  return 'We could not update your workout. Try again.';
}
