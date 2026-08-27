export function toUserFacingGroupChatError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught ?? '');
  if (/active group membership|required|permission|42501|row-level security/i.test(message)) {
    return 'Your group access changed. Refresh your memberships and try again.';
  }
  if (/rate limit/i.test(message)) return 'You’re sending messages too quickly. Wait a moment and try again.';
  if (/already posted/i.test(message)) return 'That message was already posted.';
  if (/between 1 and 1000/i.test(message)) return 'Group messages must be between 1 and 1,000 characters.';
  return 'Group chat is temporarily unavailable. Please try again.';
}
