import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupService } from '../groupService';
import { useGroupAdministration } from '../hooks/useGroupAdministration';
import type { GroupSummary } from '../model';
import { GroupAdministrationScreen } from './GroupAdministrationScreen';
import styles from './GroupAdministrationScreen.module.css';

interface GroupAdministrationControllerProps {
  userId: string;
  profile: OnboardingProfile;
  groups: GroupSummary[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onGroupsChanged: () => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: GroupService;
}

export function GroupAdministrationController(props: GroupAdministrationControllerProps) {
  const group = props.groups.find((item) => item.id === props.selectedGroupId) ?? props.groups[0];
  if (!group) return null;

  const administration = useGroupAdministration({
    userId: props.userId,
    group,
    service: props.service,
    onGroupsChanged: props.onGroupsChanged,
  });

  if (administration.status === 'loading') {
    return (
      <AppShell activeItem="groups" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}>
        <div className={styles.state} role="status">Loading group administration…</div>
      </AppShell>
    );
  }

  if (administration.status === 'error') {
    return (
      <AppShell activeItem="groups" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}>
        <section className={styles.state}>
          <p>{administration.error}</p>
          <Button onClick={() => void administration.retry()}>Try again</Button>
        </section>
      </AppShell>
    );
  }

  return (
    <GroupAdministrationScreen
      busyAction={administration.busyAction}
      error={administration.error}
      group={group}
      groups={props.groups}
      invites={administration.invites}
      members={administration.members}
      onCreateInvite={administration.createInvite}
      onLeaveGroup={async () => { const result = await administration.leaveGroup(); if (result !== null) props.onNavigate('home'); return result; }}
      onNavigate={props.onNavigate}
      onRemoveMember={administration.removeMember}
      onRename={administration.rename}
      onRevokeInvite={administration.revokeInvite}
      onSelectGroup={props.onSelectGroup}
      onSetMemberRole={administration.setMemberRole}
      onSignOut={props.onSignOut}
      onTransferOwnership={administration.transferOwnership}
      profile={props.profile}
    />
  );
}
