import competitionBanner from '../../../assets/fitness/top-set-kettlebell-chalk.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { GlobalAllTimeLeaderboard, GroupCompetitionEntry } from '../model';
import styles from './GlobalAllTimeLeaderboardScreen.module.css';

interface Props {
  profile: OnboardingProfile;
  leaderboard: GlobalAllTimeLeaderboard;
  hasGroup: boolean;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onShowGroup: () => void;
}

function LeaderboardRow({ entry }: { entry: GroupCompetitionEntry }) {
  return (
    <li className={styles.leaderboardRow}>
      <span className={styles.rank}>{entry.rank}</span>
      <ProfilePicture displayName={entry.displayName} size="sm" src={entry.profilePictureUrl} />
      <div className={styles.identity}>
        <strong>{entry.displayName}{entry.isCurrentUser ? ' · You' : ''}</strong>
        <span>@{entry.username}</span>
      </div>
      <b className={styles.xp}>{entry.xp} XP</b>
      <span className={styles.supportingStats}>
        {entry.liftingDays} lift days · {entry.prCount} PRs · {entry.badgeCount} badges
      </span>
    </li>
  );
}

export function GlobalAllTimeLeaderboardScreen({
  profile,
  leaderboard,
  hasGroup,
  onNavigate,
  onSignOut,
  onShowGroup,
}: Props) {
  return (
    <AppShell
      activeItem="compete"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page} data-global-all-time-composition>
        <DestinationBanner className={styles.headerSurface} imagePosition="center 50%" imageSrc={competitionBanner}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>COMPETE</p>
            <h1>Global all-time</h1>
            <p>Lifetime authoritative XP across every eligible Top Set athlete.</p>
          </div>
          <Button
            className={styles.scopeButton}
            onClick={hasGroup ? onShowGroup : () => onNavigate('groups')}
            variant="secondary"
          >
            {hasGroup ? 'Crew weekly' : 'Find a crew'}
          </Button>
        </DestinationBanner>

        <section className={styles.leaderboardSurface} aria-labelledby="global-leaderboard-heading" data-global-all-time-surface="leaderboard">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>All-time leaderboard</p>
            <h2 id="global-leaderboard-heading">Top 10 across Top Set</h2>
            <p>One lifetime rank per athlete. Group membership does not change global XP.</p>
          </div>

          {leaderboard.top10.length === 0 ? (
            <p className={styles.empty}>Global standings will appear after eligible athletes earn authoritative XP.</p>
          ) : (
            <ol className={styles.leaderboard}>
              {leaderboard.top10.map((entry) => <LeaderboardRow entry={entry} key={entry.userId} />)}
            </ol>
          )}
        </section>

        <section className={styles.currentUserSurface} aria-label="Your global rank" data-global-all-time-surface="current-user">
          <p className={styles.sectionLabel}>Your global rank</p>
          {leaderboard.currentUser ? (
            <div className={styles.currentUserRow}>
              <strong>#{leaderboard.currentUser.rank}</strong>
              <div className={styles.currentIdentity}>
                <span>{leaderboard.currentUser.displayName}</span>
                <small>@{leaderboard.currentUser.username}</small>
              </div>
              <b>{leaderboard.currentUser.xp} XP</b>
              <small className={styles.currentStats}>
                {leaderboard.currentUser.liftingDays} lift days · {leaderboard.currentUser.prCount} PRs · {leaderboard.currentUser.badgeCount} badges
              </small>
            </div>
          ) : (
            <p className={styles.empty}>Your global rank is not available yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
