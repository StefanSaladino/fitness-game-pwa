import type { AppSection } from '../../../components/layout';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupService } from '../groupService';
import { useCreateGroup } from '../hooks/useCreateGroup';
import { usePendingGroupInvites } from '../hooks/usePendingGroupInvites';
import type { CreateGroupInput } from '../model';
import { OptionalGroupSetupScreen } from './OptionalGroupSetupScreen';

interface OptionalGroupSetupControllerProps {
  activeItem: 'groups' | 'compete';
  profile: OnboardingProfile;
  onMembershipReady: () => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: GroupService;
}

export function OptionalGroupSetupController({ activeItem, profile, onMembershipReady, onNavigate, onSignOut, service }: OptionalGroupSetupControllerProps) {
  const createState = useCreateGroup(profile.id, service);
  const pending = usePendingGroupInvites(service, onMembershipReady);

  async function handleCreate(input: CreateGroupInput) {
    const group = await createState.create(input);
    if (group) await onMembershipReady();
    return group;
  }

  return (
    <OptionalGroupSetupScreen
      activeItem={activeItem}
      busyAction={pending.busyAction}
      createError={createState.error}
      creating={createState.submitting}
      inviteError={pending.error}
      inviteStatus={pending.status}
      onAcceptInvite={pending.accept}
      onCreate={handleCreate}
      onDeclineInvite={pending.decline}
      onNavigate={onNavigate}
      onRetryInvites={pending.retry}
      onSignOut={onSignOut}
      pendingInvites={pending.invites}
      profile={profile}
    />
  );
}
