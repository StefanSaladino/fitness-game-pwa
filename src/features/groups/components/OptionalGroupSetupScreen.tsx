import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { CreateGroupInput, PendingGroupInvite } from '../model';
import { CreateGroupForm } from './CreateGroupForm';
import styles from './OptionalGroupSetupScreen.module.css';

interface OptionalGroupSetupScreenProps {
  activeItem: 'groups' | 'compete';
  profile: OnboardingProfile;
  creating: boolean;
  createError: string;
  inviteError: string;
  busyAction: string | null;
  pendingInvites: PendingGroupInvite[];
  onCreate: (input: CreateGroupInput) => Promise<unknown> | unknown;
  onAcceptInvite: (id: string) => Promise<unknown> | unknown;
  onDeclineInvite: (id: string) => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

export function OptionalGroupSetupScreen({ activeItem, profile, creating, createError, inviteError, busyAction, pendingInvites, onCreate, onAcceptInvite, onDeclineInvite, onNavigate, onSignOut }: OptionalGroupSetupScreenProps) {
  const competitionMode = activeItem === 'compete';
  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.kicker}>{competitionMode ? 'COMPETITION' : 'GROUPS'}</p>
          <h1>{competitionMode ? 'Competition starts when you join a group.' : 'Train solo or add a group when you want.'}</h1>
          <p>{competitionMode
            ? 'Your workouts, XP, progress, and badges continue normally without a group. Join or create one only when you want shared competition.'
            : 'A group is optional. You can keep using the full personal training experience and create or join groups later.'}</p>
        </header>

        {pendingInvites.length > 0 && (
          <section className={styles.section} aria-labelledby="pending-group-invitations">
            <div>
              <p className={styles.sectionLabel}>For you</p>
              <h2 id="pending-group-invitations">Pending invitations</h2>
              <p>Accepting an invitation adds a membership to your account. Future invitations can add additional groups too.</p>
            </div>
            {inviteError && <p className={styles.error} role="alert">{inviteError}</p>}
            <ul className={styles.inviteList}>
              {pendingInvites.map((invite) => (
                <li key={invite.id}>
                  <div>
                    <strong>{invite.groupName}</strong>
                    <span>Invited by {invite.invitedByDisplayName} (@{invite.invitedByUsername})</span>
                  </div>
                  <div className={styles.actions}>
                    <Button disabled={busyAction !== null} onClick={() => void onAcceptInvite(invite.id)}>Accept</Button>
                    <Button disabled={busyAction !== null} onClick={() => void onDeclineInvite(invite.id)} variant="ghost">Decline</Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section} aria-labelledby="create-group-heading">
          <div>
            <p className={styles.sectionLabel}>Optional</p>
            <h2 id="create-group-heading">Create a group</h2>
            <p>You become the owner of this group. Creating one does not prevent you from joining or owning other groups later.</p>
          </div>
          <div className={styles.formWrap}>
            <CreateGroupForm busy={creating} error={createError} onSubmit={onCreate} />
          </div>
        </section>

        <section className={styles.solo} aria-label="Continue solo">
          <div>
            <strong>Prefer to stay solo?</strong>
            <p>Nothing else is required. Return to Home and keep training.</p>
          </div>
          <Button onClick={() => onNavigate('home')} variant="secondary">Back to dashboard</Button>
        </section>
      </div>
    </AppShell>
  );
}
