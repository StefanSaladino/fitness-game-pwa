import type { ReactNode } from 'react';
import plateBanner from '../../../assets/fitness/top-set-plate-banner.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import { navigateToPath } from '../../../lib/appNavigation';
import { BadgeCoin, badgePresentationDefinition } from '../../badges';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { DashboardRecentPr, DashboardSnapshot } from '../model';
import styles from './DashboardScreen.module.css';

interface DashboardScreenProps {
  profile: OnboardingProfile;
  group: GroupSummary | null;
  groupNotice?: ReactNode;
  snapshot: DashboardSnapshot;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

interface DashboardErrorProps {
  profile: OnboardingProfile;
  message: string;
  onNavigate: (section: AppSection) => void;
  onRetry: () => void;
  onSignOut: () => void;
}

function formatScoringDate(value: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatPr(pr: DashboardRecentPr): { performance: string; benchmark: string } {
  if (pr.metricType === 'BODYWEIGHT_REPS') {
    const reps = pr.bestReps ?? Math.round(pr.bestValue);
    return { performance: `${reps} reps`, benchmark: 'Bodyweight best' };
  }

  const weight = pr.bestWeightKg === null ? null : Math.round(pr.bestWeightKg * 10) / 10;
  const performance = weight === null
    ? `e1RM ${Math.round(pr.bestValue)} kg`
    : `${weight} kg${pr.bestReps ? ` × ${pr.bestReps}` : ''}`;
  return { performance, benchmark: `e1RM ${Math.round(pr.bestValue)} kg` };
}

function weekDates(weekStart: string): Array<{ date: string; label: string }> {
  const start = new Date(`${weekStart}T12:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index],
    };
  });
}

function DashboardShell({ profile, children, onNavigate, onSignOut, weeklyTarget = profile.weeklyWorkoutTarget }: { profile: OnboardingProfile; children: ReactNode; onNavigate: (section: AppSection) => void; onSignOut: () => void; weeklyTarget?: number }) {
  return (
    <AppShell
      activeItem="home"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${weeklyTarget} lift days`}
      mobileTitle="Home"
    >
      {children}
    </AppShell>
  );
}

export function DashboardLoading({ profile, onNavigate, onSignOut }: Pick<DashboardScreenProps, 'profile' | 'onNavigate' | 'onSignOut'>) {
  return (
    <DashboardShell profile={profile} onNavigate={onNavigate} onSignOut={onSignOut}>
      <div className={styles.state} role="status">Loading your lifting dashboard…</div>
    </DashboardShell>
  );
}

export function DashboardError({ profile, message, onNavigate, onRetry, onSignOut }: DashboardErrorProps) {
  return (
    <DashboardShell profile={profile} onNavigate={onNavigate} onSignOut={onSignOut}>
      <section className={styles.state}>
        <p className={styles.kicker}>DASHBOARD</p>
        <h1>Training data unavailable</h1>
        <p>{message}</p>
        <Button onClick={onRetry}>Try again</Button>
      </section>
    </DashboardShell>
  );
}

export function DashboardScreen({ profile, group, groupNotice, snapshot, onNavigate, onSignOut }: DashboardScreenProps) {
  const completed = new Set(snapshot.completedLiftingDates);
  const currentRank = snapshot.leaderboard.find((entry) => entry.isCurrentUser);
  const targetPercent = Math.min(100, Math.round((snapshot.completedLiftingDays / snapshot.weeklyTarget) * 100));
  const earnedBadges = snapshot.consistency.badges.slice(0, 2);
  const visibleLeaderboard = currentRank && currentRank.rank > 3
    ? [...snapshot.leaderboard.slice(0, 2), currentRank]
    : snapshot.leaderboard.slice(0, 3);

  return (
    <DashboardShell profile={profile} onNavigate={onNavigate} onSignOut={onSignOut} weeklyTarget={snapshot.weeklyTarget}>
      <div className={styles.dashboard}>
        <DestinationBanner className={styles.hero} imagePosition="center 46%" imageSrc={plateBanner}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>{group?.name ?? 'SOLO TRAINING'}</p>
              <h1>Your lifting week</h1>
              <p>Completed lifts and authoritative lifting-v1 scoring.</p>
            </div>
            <div className={styles.heroIdentity}>
              <ProfilePicture displayName={profile.displayName} size="md" src={snapshot.currentUserProfilePictureUrl} />
              <div>
                <strong>{profile.displayName}</strong>
                <span>@{profile.username}</span>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Button onClick={() => onNavigate('workouts')}>Start Lift</Button>
              <Button variant="secondary" onClick={() => onNavigate('cardio')}>Log cardio</Button>
            </div>
          </div>
        </DestinationBanner>

        <section className={styles.overview} aria-labelledby="weekly-progress-heading" data-app-surface="category">
          <div className={styles.weekPrimary}>
            <p className={styles.sectionLabel} id="weekly-progress-heading">Weekly lifting target</p>
            <div className={styles.weekCount}>
              <strong>{snapshot.completedLiftingDays}</strong>
              <span>/ {snapshot.weeklyTarget} lifting days</span>
            </div>
            <div className={styles.weekDays} aria-label={`${snapshot.completedLiftingDays} of ${snapshot.weeklyTarget} lifting days complete`}>
              {weekDates(snapshot.weekStart).map((day) => (
                <div className={styles.weekDay} key={day.date}>
                  <span className={completed.has(day.date) ? styles.dayComplete : styles.dayOpen} aria-hidden="true" />
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${targetPercent}%` }} />
            </div>
          </div>

          <div className={styles.xpSummary}>
            <p className={styles.sectionLabel}>This week</p>
            <strong>{snapshot.weeklyXp} XP</strong>
            <small>{formatScoringDate(snapshot.weekStart)}–{formatScoringDate(snapshot.weekEnd)}</small>
            <dl className={styles.xpBreakdown}>
              <div><dt>Workout</dt><dd>{snapshot.xpBreakdown.workout}</dd></div>
              <div><dt>Exercises</dt><dd>{snapshot.xpBreakdown.exercises}</dd></div>
              <div><dt>Progression</dt><dd>{snapshot.xpBreakdown.progression}</dd></div>
              <div className={styles.cardioRow}><dt>Cardio bonus</dt><dd>{snapshot.xpBreakdown.cardio}</dd></div>
            </dl>
            <p className={styles.secondaryNote}>Cardio stays secondary to lifting completion and progression.</p>
          </div>
        </section>

        <div className={styles.trainingColumns}>
          <section className={styles.dataSection} aria-labelledby="recent-lifts-heading" data-app-surface="category">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>Recent lifts</p>
                <h2 id="recent-lifts-heading">Training log</h2>
              </div>
            </div>

            {snapshot.recentLifts.length === 0 ? (
              <p className={styles.empty}>Completed strength sessions will appear here.</p>
            ) : (
              <ul className={styles.rows}>
                {snapshot.recentLifts.map((lift) => (
                  <li key={lift.id}>
                    <div>
                      <strong>{lift.title}</strong>
                      <span>{formatScoringDate(lift.scoringDate)} · {lift.durationMinutes} min · {lift.exerciseCount} exercises</span>
                    </div>
                    <b>{lift.xp} XP</b>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.dataSection} aria-labelledby="recent-prs-heading" data-app-surface="category">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>Personal records</p>
                <h2 id="recent-prs-heading">Progression</h2>
              </div>
            </div>

            {snapshot.recentPrs.length === 0 ? (
              <p className={styles.empty}>Your first valid performance establishes each exercise baseline.</p>
            ) : (
              <ul className={styles.rows}>
                {snapshot.recentPrs.map((pr) => {
                  const formatted = formatPr(pr);
                  return (
                    <li key={`${pr.exerciseId}-${pr.metricType}`}>
                      <div>
                        <strong>{pr.exerciseName}</strong>
                        <span>{formatted.performance} · {formatted.benchmark}</span>
                      </div>
                      <time dateTime={pr.achievedAt}>{formatTimestamp(pr.achievedAt)}</time>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section className={styles.lowerGrid}>
          <section className={styles.consistencyBlock} aria-labelledby="consistency-heading" data-app-surface="category">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>Consistency</p>
                <h2 id="consistency-heading">Completed weeks & badges</h2>
              </div>
            </div>

            <dl className={styles.consistencyStats}>
              <div><dt>Current streak</dt><dd>{snapshot.consistency.currentCompletedWeekStreak} weeks</dd></div>
              <div><dt>Best streak</dt><dd>{snapshot.consistency.bestCompletedWeekStreak} weeks</dd></div>
              <div><dt>Goals hit</dt><dd>{snapshot.consistency.goalsHit} / {snapshot.consistency.completedWeeks}</dd></div>
            </dl>

            <div className={styles.badgeHeading}>
              <div className={styles.badgeHeadingCopy}>
                <strong>Earned badges</strong>
                <span>{snapshot.consistency.badges.length} collected</span>
              </div>
              <Button onClick={() => navigateToPath('/badges')} variant="ghost">View badge gallery</Button>
            </div>
            {earnedBadges.length === 0 ? (
              <div className={styles.badgeEmpty}>
                <p className={styles.empty}>Complete lift days, weekly goals, and personal records to earn recognition badges.</p>
                <Button onClick={() => navigateToPath('/badges')} variant="secondary">Explore locked badges</Button>
              </div>
            ) : (
              <ul className={styles.badgePreview}>
                {earnedBadges.map((badge) => {
                  const definition = badgePresentationDefinition(badge.badgeKey);
                  return (
                    <li key={badge.badgeKey}>
                      <BadgeCoin definition={definition} earnedAt={badge.earnedAt} size="sm" />
                      <div className={styles.badgePreviewMeta}>
                        <span>{definition.category}</span>
                        <time dateTime={badge.earnedAt}>Earned {formatTimestamp(badge.earnedAt)}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={styles.rankBlock} aria-labelledby="group-rank-heading" data-app-surface="category">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>{group?.name ?? 'Group competition'}</p>
                <h2 id="group-rank-heading">This week’s group rank</h2>
              </div>
              {group && <Button onClick={() => onNavigate('compete')} variant="ghost">View competition</Button>}
            </div>

            {!group ? (
              <div className={styles.soloRank}>
                <strong>Not in a group</strong>
                <p>Your lifting dashboard works fully without group membership.</p>
              </div>
            ) : snapshot.leaderboard.length === 0 ? (
              <p className={styles.empty}>No ranking yet for this week.</p>
            ) : (
              <>
                <ol className={styles.leaderboardRows}>
                  {visibleLeaderboard.map((entry) => (
                    <li className={entry.isCurrentUser ? styles.currentUser : ''} key={entry.userId}>
                      <span className={styles.rank}>#{entry.rank}</span>
                      <ProfilePicture displayName={entry.displayName} size="sm" src={entry.profilePictureUrl} />
                      <div className={styles.memberIdentity}>
                        <strong>{entry.displayName}{entry.isCurrentUser ? ' (You)' : ''}</strong>
                        <span>@{entry.username}</span>
                      </div>
                      <b>{entry.xp} XP</b>
                    </li>
                  ))}
                </ol>
                <div className={styles.rankMeta}>
                  <span>{snapshot.leaderboard.length} active members</span>
                  <strong>{currentRank ? `You are #${currentRank.rank}` : 'No personal rank yet'}</strong>
                </div>
              </>
            )}
          </section>
        </section>

        {groupNotice && <div className={styles.supportingContent}>{groupNotice}</div>}
      </div>
    </DashboardShell>
  );
}
