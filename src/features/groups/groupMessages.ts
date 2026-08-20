import { GroupValidationError } from './validation';
type ErrorLike={message?:string;code?:string};
export function toUserFacingGroupError(error:unknown):string {
  if(error instanceof GroupValidationError) return error.issues[0]?.message ?? 'Check the group details and try again.';
  const value=error as ErrorLike|null; const message=value?.message?.toLowerCase()??'';
  if(message.includes('user not found')) return 'No user matches that username or invite ID.';
  if(message.includes('already an active group member')) return 'That user is already in this group.';
  if(message.includes('cannot invite yourself')) return 'You are already in this group.';
  if(message.includes('invite not found')) return 'That invitation is no longer active.';
  if(message.includes('reusable invite codes')) return 'Reusable group invite codes are no longer supported.';
  if(message.includes('transfer ownership before leaving')) return 'Transfer ownership to another active member before leaving this group.';
  if(message.includes('only the owner')) return 'Only the group owner can perform that action.';
  if(message.includes('admin can only remove members')) return 'Admins can remove members, but not other admins or the owner.';
  if(message.includes('not a group member')||value?.code==='42501') return 'You do not have permission to perform that group action.';
  return 'Something went wrong with the group. Try again.';
}
