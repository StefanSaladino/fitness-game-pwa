export function toUserFacingDashboardError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/not a group member|permission|row-level security|42501/i.test(message)) {
    return 'Your group access changed. Refresh your memberships and try again.';
  }
  if (/network|fetch|connection/i.test(message)) {
    return 'We couldn’t reach your training data. Check your connection and try again.';
  }
  return 'We couldn’t load your lifting dashboard. Try again.';
}
