export function toUserFacingSocialError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Group competition could not be loaded. Try again.';
}
