import type { GroupService } from '../groupService';
import { useCreateGroup } from '../hooks/useCreateGroup';
import { usePendingGroupInvites } from '../hooks/usePendingGroupInvites';
import type { CreateGroupInput } from '../model';
import { GroupSetupScreen } from './GroupSetupScreen';

interface Props{userId:string;profileCode?:string;onMembershipReady():Promise<unknown>|unknown;service?:GroupService}
export function GroupSetupController({userId,profileCode,onMembershipReady,service}:Props){
  const createState=useCreateGroup(userId,service);
  const pending=usePendingGroupInvites(service,onMembershipReady);
  async function handleCreate(input:CreateGroupInput){const g=await createState.create(input);if(g) await onMembershipReady();}
  return <GroupSetupScreen
    profileCode={profileCode}
    createError={createState.error} creating={createState.submitting}
    inviteError={pending.error} pendingInvites={pending.invites} busyAction={pending.busyAction}
    onAcceptInvite={pending.accept} onDeclineInvite={pending.decline} onCreate={handleCreate}
  />;
}
