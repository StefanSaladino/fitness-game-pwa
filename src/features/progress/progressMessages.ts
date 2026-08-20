export function toUserFacingProgressError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load your lifting progress right now.';
}
