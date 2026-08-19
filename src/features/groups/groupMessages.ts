import { GroupValidationError } from './validation';

type ErrorLike = { message?: string; code?: string };

export function toUserFacingGroupError(error: unknown): string {
  if (error instanceof GroupValidationError) {
    return error.issues[0]?.message ?? 'Check the group details and try again.';
  }

  const value = error as ErrorLike | null;
  const message = value?.message?.toLowerCase() ?? '';

  if (message.includes('invite not found')) return 'That invite could not be found.';
  if (message.includes('invite has expired')) return 'That invite has expired.';
  if (message.includes('invite has been revoked')) return 'That invite is no longer active.';
  if (message.includes('use limit')) return 'That invite has reached its use limit.';
  if (message.includes('transfer ownership before leaving')) return 'Transfer ownership to another active member before leaving this group.';
  if (message.includes('only the owner')) return 'Only the group owner can perform that action.';
  if (message.includes('admin can only remove members')) return 'Admins can remove members, but not other admins or the owner.';
  if (message.includes('not a group member') || value?.code === '42501') {
    return 'You do not have permission to perform that group action.';
  }

  return 'Something went wrong with the group. Try again.';
}
