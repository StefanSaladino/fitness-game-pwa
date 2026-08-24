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
  inviteStatus: 'loading' | 'ready' | 'error';
  busyAction: string | null;
  pendingInvites: PendingGroupInvite[];
  onCreate: (input: CreateGroupInput) => Promise<unknown> | unknown;
  onAcceptInvite: (id: string) => Promise<unknown> | unknown;
  onDeclineInvite: (id: string) => Promise<unknown> | unknown;
  onRetryInvites: () => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

function groupInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('') || 'G';
}

export function OptionalGroupSetupScreen({
  activeItem,
  profile,
  creating,
  createError,
  inviteError,
  inviteStatus,
  busyAction,
  pendingInvites,
  onCreate,
  onAcceptInvite,
  onDeclineInvite,
  onRetryInvites,
  onNavigate,
  onSignOut,
}: OptionalGroupSetupScreenProps) {
  const competitionMode = activeItem === 'compete';
  const hasInvites = pendingInvites.length > 0;

  const bannerTitle = hasInvites
    ? 'Pending invitations'
    : competitionMode
      ? 'Competition starts with a group.'
      : 'Groups are optional.';

  const bannerCopy = hasInvites
    ? 'Review the crew that invited you. Joining adds the group without replacing your other memberships.'
    : competitionMode
      ? 'Your personal training still works without one. Create a group when you want shared competition.'
      : 'Train on your own or create a group when you want shared competition.';

  return (
    <AppShell
      activeItem={activeItem}
      mobileTitle={competitionMode ? 'Compete' : 'Groups'}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page}>
        <section className={styles.photoBanner} aria-labelledby="group-state-heading">
          <div className={styles.photoBannerCopy}>
            <span>{hasInvites ? 'INVITATIONS' : competitionMode ? 'COMPETE' : 'GROUPS'}</span>
            <h1 id="group-state-heading">{bannerTitle}</h1>
            <p>{bannerCopy}</p>
          </div>
        </section>

        {inviteStatus === 'loading' && !hasInvites ? (
          <section className={styles.inlineStatus} role="status">
            <span className={styles.inlineLoader} aria-hidden="true" />
            <p>Checking invitations…</p>
          </section>
        ) : null}

        {inviteStatus === 'error' && !hasInvites ? (
          <section className={styles.retryState} aria-label="Invitation loading error">
            <p role="alert">{inviteError || 'We couldn’t load your invitations.'}</p>
            <Button className={styles.secondaryButton} onClick={() => void onRetryInvites()} variant="secondary">
              Try again
            </Button>
          </section>
        ) : null}

        {hasInvites ? (
          <section className={styles.invitationState}>
            {inviteError ? <p className={styles.error} role="alert">{inviteError}</p> : null}

            <ul className={styles.inviteList}>
              {pendingInvites.map((invite) => (
                <li className={styles.inviteCard} key={invite.id}>
                  <div className={styles.inviteTop}>
                    <span className={styles.groupAvatar} aria-hidden="true">{groupInitials(invite.groupName)}</span>
                    <div className={styles.inviteIdentity}>
                      <strong>{invite.groupName}</strong>
                      <span className={styles.invitedBy}>Invited by</span>
                      <span>{invite.invitedByDisplayName}</span>
                      <span>@{invite.invitedByUsername}</span>
                    </div>
                  </div>
                  <div className={styles.inviteActions}>
                    <Button
                      className={styles.secondaryButton}
                      disabled={busyAction !== null}
                      onClick={() => void onDeclineInvite(invite.id)}
                      variant="secondary"
                    >
                      Decline
                    </Button>
                    <Button
                      className={styles.primaryButton}
                      disabled={busyAction !== null}
                      onClick={() => void onAcceptInvite(invite.id)}
                    >
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className={styles.sectionDivider} />

            <section className={styles.soloSection} aria-labelledby="no-thanks-heading">
              <h2 id="no-thanks-heading">No thanks</h2>
              <p>Groups are optional. You can keep training without accepting this invitation.</p>
              <Button
                className={styles.fullSecondaryButton}
                fullWidth
                onClick={() => onNavigate('home')}
                variant="secondary"
              >
                Go to Home
              </Button>
            </section>
          </section>
        ) : (
          <section className={styles.zeroState}>
            <section className={styles.createCard} aria-labelledby="create-group-heading">
              <h2 id="create-group-heading">Create your group</h2>
              <p>Start your own crew and invite specific people after it is created.</p>
              <CreateGroupForm busy={creating} compact error={createError} onSubmit={onCreate} />
            </section>

            <div className={styles.orDivider}><span>or</span></div>

            <Button
              className={styles.fullSecondaryButton}
              fullWidth
              onClick={() => onNavigate('home')}
              variant="secondary"
            >
              Go to Home
            </Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
