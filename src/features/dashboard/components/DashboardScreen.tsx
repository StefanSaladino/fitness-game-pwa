import type { ReactNode } from 'react';
import { AppShell } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { DashboardRecentPr, DashboardSnapshot } from '../model';
import styles from './DashboardScreen.module.css';

interface DashboardScreenProps {
  profile: OnboardingProfile;
  group: GroupSummary;
  snapshot: DashboardSnapshot;
  onSignOut: () => void;
}

interface DashboardErrorProps {
  profile: OnboardingProfile;
  message: string;
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

function DashboardShell({ profile, children, onSignOut }: { profile: OnboardingProfile; children: ReactNode; onSignOut: () => void }) {
  return (
    <AppShell
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      {children}
    </AppShell>
  );
}

export function DashboardLoading({ profile, onSignOut }: Pick<DashboardScreenProps, 'profile' | 'onSignOut'>) {
  return (
    <DashboardShell profile={profile} onSignOut={onSignOut}>
      <div className={styles.state} role="status">Loading your lifting dashboard…</div>
    </DashboardShell>
  );
}

export function DashboardError({ profile, message, onRetry, onSignOut }: DashboardErrorProps) {
  return (
    <DashboardShell profile={profile} onSignOut={onSignOut}>
      <section className={styles.state}>
        <p className={styles.kicker}>DASHBOARD</p>
        <h1>Training data unavailable</h1>
        <p>{message}</p>
        <Button onClick={onRetry}>Try again</Button>
      </section>
    </DashboardShell>
  );
}

export function DashboardScreen({ profile, group, snapshot, onSignOut }: DashboardScreenProps) {
  const completed = new Set(snapshot.completedLiftingDates);
  const currentRank = snapshot.leaderboard.find((entry) => entry.isCurrentUser);
  const targetPercent = Math.min(100, Math.round((snapshot.completedLiftingDays / snapshot.weeklyTarget) * 100));

  return (
    <DashboardShell profile={profile} onSignOut={onSignOut}>
      <div className={styles.dashboard}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{group.name}</p>
            <h1>Your lifting week</h1>
            <p className={styles.subhead}>Progress from completed lifts and authoritative lifting-v1 scoring.</p>
          </div>
          <div className={styles.identity}>
            <ProfilePicture displayName={profile.displayName} size="lg" src={snapshot.currentUserProfilePictureUrl} />
            <div>
              <strong>{profile.displayName}</strong>
              <span>@{profile.username}</span>
            </div>
          </div>
        </header>

        <section className={styles.weekSummary} aria-labelledby="weekly-progress-heading">
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

          <div className={styles.metric}>
            <span>This week</span>
            <strong>{snapshot.weeklyXp} XP</strong>
            <small>{formatScoringDate(snapshot.weekStart)}–{formatScoringDate(snapshot.weekEnd)}</small>
          </div>

          <div className={styles.metric}>
            <span>Group rank</span>
            <strong>{currentRank ? `#${currentRank.rank}` : '—'}</strong>
            <small>{snapshot.leaderboard.length ? `${snapshot.leaderboard.length} active members` : 'No ranking yet'}</small>
          </div>
        </section>

        <section className={styles.xpSection} aria-labelledby="xp-breakdown-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel} id="xp-breakdown-heading">XP breakdown</p>
              <h2>{snapshot.weeklyXp} XP this week</h2>
            </div>
            <p>Cardio stays a small bonus; lifting completion and progression drive the score.</p>
          </div>
          <dl className={styles.xpBreakdown}>
            <div><dt>Workout</dt><dd>{snapshot.xpBreakdown.workout}</dd></div>
            <div><dt>Exercises</dt><dd>{snapshot.xpBreakdown.exercises}</dd></div>
            <div><dt>Progression</dt><dd>{snapshot.xpBreakdown.progression}</dd></div>
            <div className={styles.cardioRow}><dt>Cardio bonus</dt><dd>{snapshot.xpBreakdown.cardio}</dd></div>
          </dl>
        </section>

        <div className={styles.trainingColumns}>
          <section className={styles.dataSection} aria-labelledby="recent-lifts-heading">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>Training log</p>
                <h2 id="recent-lifts-heading">Recent lifts</h2>
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

          <section className={styles.dataSection} aria-labelledby="recent-prs-heading">
            <div className={styles.sectionHeadingCompact}>
              <div>
                <p className={styles.sectionLabel}>Progression</p>
                <h2 id="recent-prs-heading">Personal records</h2>
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

        <section className={styles.leaderboard} aria-labelledby="group-rank-heading">
          <div className={styles.sectionHeadingCompact}>
            <div>
              <p className={styles.sectionLabel}>{group.name}</p>
              <h2 id="group-rank-heading">This week’s group rank</h2>
            </div>
            <span className={styles.memberCount}>{group.memberCount} members</span>
          </div>

          <ol className={styles.leaderboardRows}>
            {snapshot.leaderboard.map((entry) => (
              <li className={entry.isCurrentUser ? styles.currentUser : ''} key={entry.userId}>
                <span className={styles.rank}>{entry.rank}</span>
                <ProfilePicture displayName={entry.displayName} size="sm" src={entry.profilePictureUrl} />
                <div className={styles.memberIdentity}>
                  <strong>{entry.displayName}{entry.isCurrentUser ? ' (You)' : ''}</strong>
                  <span>@{entry.username}</span>
                </div>
                <b>{entry.xp} XP</b>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </DashboardShell>
  );
}
