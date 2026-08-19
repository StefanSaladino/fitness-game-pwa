import type { GroupService } from '../groupService';
import { useCreateGroup } from '../hooks/useCreateGroup';
import { useJoinGroup } from '../hooks/useJoinGroup';
import type { CreateGroupInput } from '../model';
import { GroupSetupScreen } from './GroupSetupScreen';

interface GroupSetupControllerProps {
  userId: string;
  onMembershipReady(): Promise<unknown> | unknown;
  service?: GroupService;
}

export function GroupSetupController({ userId, onMembershipReady, service }: GroupSetupControllerProps) {
  const createState = useCreateGroup(userId, service);
  const joinState = useJoinGroup(service);

  async function handleCreate(input: CreateGroupInput) {
    const group = await createState.create(input);
    if (group) await onMembershipReady();
  }

  async function handleJoin(inviteToken: string) {
    const groupId = await joinState.join(inviteToken);
    if (groupId) await onMembershipReady();
  }

  return (
    <GroupSetupScreen
      createError={createState.error}
      creating={createState.submitting}
      joinError={joinState.error}
      joining={joinState.submitting}
      onCreate={handleCreate}
      onJoin={handleJoin}
    />
  );
}
