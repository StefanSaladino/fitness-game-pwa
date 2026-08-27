import { useMemo, useState } from 'react';
import competitionBanner from '../../../assets/fitness/top-set-kettlebell-chalk.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button, SelectField } from '../../../components/ui';
import { liftingBadgeDefinition } from '../../consistency';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { UserReportDialog, type UserReportReference, type UserReportService } from '../../moderation';
import { ProfilePicture } from '../../profile-picture';
import type {
  BadgeActivityMetadata,
  GoalActivityMetadata,
  GroupCompetitionLeaderboard,
  GroupCompetitionPeriod,
  GroupReactionType,
  GroupSocialFeedItem,
  LiftActivityMetadata,
  PrActivityMetadata,
} from '../model';
import styles from './GroupSocialScreen.module.css';
import reportStyles from './GroupSocialReports.module.css';

interface Props {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  group: GroupSummary;
  weekly: GroupCompetitionLeaderboard;
  allTime: GroupCompetitionLeaderboard;
  feed: GroupSocialFeedItem[];
  hasMore: boolean;
  loadingMore: boolean;
  busyReactionKey: string | null;
  error: string;
  reportService?: UserReportService;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onSelectGroup: (groupId: string) => void;
  onLoadMore: () => void;
  onReact: (activityKey: string, reaction: GroupReactionType) => void;
}

interface ReportTarget {
  userId: string;
  username: string;
  displayName: string;
  reference: UserReportReference;
}

interface ActivityContent {
  kicker: string;
  title: string;
  detail: string;
}

type SocialView = 'standings' | 'activity';

const reactionCopy: Record<GroupReactionType, string> = {
  FIRE: 'Fire',
  STRONG: 'Strong',
  CLAP: 'Clap',
};

function shortDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00.000Z` : value);
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date);
}

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return shortDate(value);
}

function prCopy(metadata: PrActivityMetadata): string {
  if (metadata.metricType === 'BODYWEIGHT_REPS') return `${Math.round(metadata.metricValue)} reps`;

  const e1rm = `e1RM ${Math.round(metadata.metricValue)} kg`;
  if (metadata.weightKg === null) return e1rm;

  const weight = Math.round(metadata.weightKg * 10) / 10;
  return `${weight} kg${metadata.reps ? ` × ${metadata.reps}` : ''} · ${e1rm}`;
}

function activityContent(item: GroupSocialFeedItem): ActivityContent {
  if (item.activityType === 'LIFT') {
    const metadata = item.metadata as LiftActivityMetadata;
    return {
      kicker: 'Lift complete',
      title: metadata.title,
      detail: `${metadata.durationMinutes} min · ${metadata.exerciseCount} exercises · ${metadata.xp} XP`,
    };
  }

  if (item.activityType === 'PR') {
    const metadata = item.metadata as PrActivityMetadata;
    return {
      kicker: 'New PR',
      title: metadata.exerciseName,
      detail: prCopy(metadata),
    };
  }

  if (item.activityType === 'BADGE') {
    const metadata = item.metadata as BadgeActivityMetadata;
    const badge = liftingBadgeDefinition(metadata.badgeKey);
    return {
      kicker: 'Badge earned',
      title: badge.title,
      detail: badge.description,
    };
  }

  const metadata = item.metadata as GoalActivityMetadata;
  return {
    kicker: 'Weekly goal hit',
    title: `${metadata.liftingDays}/${metadata.target} lifting days`,
    detail: `Week of ${shortDate(metadata.weekStart)}`,
  };
}

function leaderboardLabel(board: GroupCompetitionLeaderboard): string {
  if (board.period === 'ALL_TIME') return 'All authoritative lifting-v1 XP';
  if (!board.periodStart || !board.periodEnd) return 'Current lifting week';
  return `${shortDate(board.periodStart)}–${shortDate(board.periodEnd)}`;
}

function groupMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'GR';

  const first = words[0] ?? '';
  if (words.length === 1) return first.slice(0, 2).toUpperCase();

  const last = words.at(-1) ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'GR';
}

function groupMeta(group: GroupSummary): string {
  const members = `${group.memberCount} member${group.memberCount === 1 ? '' : 's'}`;
  return `${members} · ${group.role.toLowerCase()}`;
}

export function GroupSocialScreen(props: Props) {
  const {
    profile,
    groups,
    group,
    weekly,
    allTime,
    feed,
    hasMore,
    loadingMore,
    busyReactionKey,
    error,
    reportService,
    onNavigate,
    onSignOut,
    onSelectGroup,
    onLoadMore,
    onReact,
  } = props;

  const [period, setPeriod] = useState<GroupCompetitionPeriod>('WEEK');
  const [view, setView] = useState<SocialView>('standings');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportNotice, setReportNotice] = useState('');
  const board = period === 'WEEK' ? weekly : allTime;
  const currentUser = useMemo(
    () => board.entries.find((entry) => entry.isCurrentUser) ?? null,
    [board],
  );

  return (
    <>
      <AppShell
        activeItem="compete"
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        userLabel={profile.displayName}
        userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
      >
        <div className={styles.page} data-social-composition>
          <DestinationBanner className={styles.headerSurface} data-social-surface="identity" imagePosition="center 50%" imageSrc={competitionBanner}>
            <div className={styles.headerCopy}>
              <p className={styles.kicker}>COMPETE</p>
              <h1>{group.name}</h1>
              <p>Competition and privacy-safe crew highlights from authoritative lifting activity.</p>
            </div>
            <Button className={styles.manageGroupButton} onClick={() => onNavigate('groups')} variant="secondary">
              Manage group
            </Button>
          </DestinationBanner>

          <section className={styles.contextSurface} aria-label={`${group.name} competition context`} data-social-surface="context">
            <span className={styles.groupMonogram} aria-hidden="true">{groupMonogram(group.name)}</span>
            <span className={styles.contextCopy}>
              <strong>{group.name}</strong>
              <small>{groupMeta(group)}</small>
            </span>
            {groups.length > 1 && (
              <SelectField
                className={styles.groupSelect}
                compact
                label="Competition group"
                labelHidden
                onChange={(event) => onSelectGroup(event.target.value)}
                value={group.id}
              >
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {groupMeta(item)}
                  </option>
                ))}
              </SelectField>
            )}
          </section>

          <section className={styles.privacyNote} aria-label="Social privacy">
            <strong>Summary-only social feed</strong>
            <span>Individual sets, workout notes, and full exercise details stay private. Reactions never affect XP.</span>
          </section>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {reportNotice && <p className={reportStyles.reportNotice} role="status">{reportNotice}</p>}

          <nav className={styles.viewTabs} aria-label="Competition sections">
            <button aria-selected={view === 'standings'} onClick={() => setView('standings')} role="tab" type="button">
              Standings
            </button>
            <button aria-selected={view === 'activity'} onClick={() => setView('activity')} role="tab" type="button">
              Activity
            </button>
          </nav>

          {view === 'standings' && (
            <section className={styles.competition} aria-labelledby="competition-heading" data-social-surface="standings" role="tabpanel">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionLabel}>Leaderboard</p>
                  <h2 id="competition-heading">Crew standings</h2>
                  <p>{leaderboardLabel(board)}</p>
                </div>

                <div className={styles.periodSwitch} role="group" aria-label="Leaderboard period">
                  <button
                    aria-pressed={period === 'WEEK'}
                    onClick={() => setPeriod('WEEK')}
                    type="button"
                  >
                    This week
                  </button>
                  <button
                    aria-pressed={period === 'ALL_TIME'}
                    onClick={() => setPeriod('ALL_TIME')}
                    type="button"
                  >
                    All time
                  </button>
                </div>
              </div>

              {currentUser && (
                <div className={styles.yourStanding} aria-label="Your leaderboard standing">
                  <span>Your standing</span>
                  <strong>#{currentUser.rank}</strong>
                  <b>{currentUser.xp} XP</b>
                  <small>{currentUser.liftingDays} lift days · {currentUser.prCount} PRs</small>
                </div>
              )}

              <ol className={styles.leaderboard}>
                {board.entries.map((entry) => (
                  <li
                    className={`${styles.leaderboardRow}${entry.isCurrentUser ? ` ${styles.currentUser}` : ''}`}
                    key={entry.userId}
                  >
                    <span className={styles.rank}>{entry.rank}</span>
                    <span className={styles.avatarCell}>
                      <ProfilePicture
                        displayName={entry.displayName}
                        size="sm"
                        src={entry.profilePictureUrl}
                      />
                    </span>
                    <div className={styles.identity}>
                      <strong>{entry.displayName}{entry.isCurrentUser ? ' · You' : ''}</strong>
                      <span>@{entry.username}</span>
                    </div>
                    <b className={styles.xp}>{entry.xp} XP</b>
                    <div className={styles.rowFooter}>
                      <span className={styles.supportingStats}>
                        {entry.liftingDays} lift days · {entry.prCount} PRs · {entry.badgeCount} badges
                      </span>
                      {!entry.isCurrentUser && (
                        <button
                          aria-label={`Report ${entry.displayName}`}
                          className={styles.reportAction}
                          onClick={() => setReportTarget({
                            userId: entry.userId,
                            username: entry.username,
                            displayName: entry.displayName,
                            reference: { type: 'GROUP', groupId: group.id },
                          })}
                          type="button"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {view === 'activity' && (
            <section className={styles.feedSection} aria-labelledby="crew-feed-heading" data-social-surface="activity" role="tabpanel">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionLabel}>Crew activity</p>
                  <h2 id="crew-feed-heading">Highlights, not surveillance</h2>
                  <p>Qualifying lifts, real PRs, badges, and completed weekly goals only.</p>
                </div>
              </div>

              {feed.length === 0 ? (
                <p className={styles.empty}>
                  Crew highlights will appear after members complete qualifying lifting activity.
                </p>
              ) : (
                <ul className={styles.feed}>
                  {feed.map((item) => {
                    const content = activityContent(item);
                    return (
                      <li className={styles.feedItem} key={item.activityKey}>
                        <div className={styles.feedIdentity}>
                          <ProfilePicture
                            displayName={item.displayName}
                            size="sm"
                            src={item.profilePictureUrl}
                          />
                          <div>
                            <strong>{item.displayName}{item.actorUserId === profile.id ? ' · You' : ''}</strong>
                            <span>
                              @{item.username} · <time dateTime={item.activityAt}>{relativeTime(item.activityAt)}</time>
                            </span>
                          </div>
                        </div>

                        <div className={styles.feedBody}>
                          <span className={styles.activityType}>{content.kicker}</span>
                          <h3>{content.title}</h3>
                          <p>{content.detail}</p>
                        </div>

                        <div className={styles.feedFooter}>
                          <div className={styles.reactions} aria-label={`Reactions to ${content.title}`}>
                            {(Object.keys(reactionCopy) as GroupReactionType[]).map((reaction) => (
                              <button
                                aria-label={`${reactionCopy[reaction]} ${item.reactions[reaction]}`}
                                aria-pressed={item.myReaction === reaction}
                                disabled={busyReactionKey === item.activityKey}
                                key={reaction}
                                onClick={() => onReact(item.activityKey, reaction)}
                                type="button"
                              >
                                <span>{reactionCopy[reaction]}</span>
                                <b>{item.reactions[reaction]}</b>
                              </button>
                            ))}
                          </div>

                          {item.actorUserId !== profile.id && (
                            <button
                              aria-label="Report this activity"
                              className={styles.reportAction}
                              onClick={() => setReportTarget({
                                userId: item.actorUserId,
                                username: item.username,
                                displayName: item.displayName,
                                reference: {
                                  type: 'SOCIAL_ACTIVITY',
                                  groupId: group.id,
                                  activityKey: item.activityKey,
                                },
                              })}
                              type="button"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {hasMore && (
                <div className={styles.loadMore}>
                  <Button disabled={loadingMore} onClick={onLoadMore} variant="secondary">
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
      </AppShell>

      {reportTarget && (
        <UserReportDialog
          onCancel={() => setReportTarget(null)}
          onSubmitted={() => setReportNotice('Report submitted to the private moderation queue.')}
          reference={reportTarget.reference}
          service={reportService}
          target={reportTarget}
        />
      )}
    </>
  );
}
