const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

export function validateAccountActionReason(value: string): string | null {
  const length = value.trim().length;
  if (length < MIN_REASON_LENGTH) return 'Enter a reason with at least 3 characters.';
  if (length > MAX_REASON_LENGTH) return 'Keep the reason to 500 characters or fewer.';
  return null;
}

export function normalizeSuspensionReviewAt(
  value: string,
  now: number = Date.now(),
): { value: string | null; error: string | null } {
  if (!value.trim()) return { value: null, error: null };
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return { value: null, error: 'Enter a valid review date and time.' };
  if (timestamp <= now) return { value: null, error: 'The review date must be in the future.' };
  return { value: new Date(timestamp).toISOString(), error: null };
}

export function deletionConfirmationFor(username: string): string {
  return `DELETE ${username}`;
}

export function deletionConfirmationMatches(value: string, username: string): boolean {
  return value === deletionConfirmationFor(username);
}
