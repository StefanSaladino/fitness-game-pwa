import type { AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { GroupService } from '../groupService';
import { usePendingGroupInvites } from '../hooks/usePendingGroupInvites';
import styles from './DashboardGroupMembership.module.css';

interface DashboardGroupMembershipProps {
  groupCount: number;
  onGroupsChanged: () => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  service?: GroupService;
}

export function DashboardGroupMembership({ groupCount, onGroupsChanged, onNavigate, service }: DashboardGroupMembershipProps) {
  const pending = usePendingGroupInvites(service, onGroupsChanged);

  if (pending.status === 'loading' && groupCount > 0) return null;

  if (pending.status === 'error') {
    return (
      <section className={styles.section} aria-labelledby="group-membership-heading">
        <div>
          <p className={styles.kicker}>GROUPS</p>
          <h2 id="group-membership-heading">Group invitations unavailable</h2>
          <p className={styles.copy}>{pending.error}</p>
        </div>
        <Button onClick={() => void pending.retry()} variant="secondary">Try again</Button>
      </section>
    );
  }

  if (pending.invites.length === 0) {
    if (groupCount > 0) return null;
    return (
      <section className={styles.section} aria-labelledby="group-membership-heading">
        <div>
          <p className={styles.kicker}>TRAIN SOLO OR WITH A CREW</p>
          <h2 id="group-membership-heading">Groups are optional.</h2>
          <p className={styles.copy}>Your lifting dashboard, workouts, cardio, and progress work without a group. Create one whenever you want or accept a future invitation.</p>
        </div>
        <Button onClick={() => onNavigate('groups')} variant="secondary">Manage groups</Button>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="group-membership-heading">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>GROUP INVITATIONS</p>
          <h2 id="group-membership-heading">You have {pending.invites.length} pending invitation{pending.invites.length === 1 ? '' : 's'}.</h2>
          <p className={styles.copy}>Accepting an invitation adds that group to your account. It does not replace any group you already belong to.</p>
        </div>
        <Button onClick={() => onNavigate('groups')} variant="ghost">All groups</Button>
      </div>
      <ul className={styles.list}>
        {pending.invites.map((invite) => {
          const busy = pending.busyAction !== null;
          return (
            <li key={invite.id}>
              <div className={styles.identity}>
                <strong>{invite.groupName}</strong>
                <span>Invited by {invite.invitedByDisplayName} (@{invite.invitedByUsername})</span>
              </div>
              <div className={styles.actions}>
                <Button disabled={busy} onClick={() => void pending.accept(invite.id)}>Accept</Button>
                <Button disabled={busy} onClick={() => void pending.decline(invite.id)} variant="ghost">Decline</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
