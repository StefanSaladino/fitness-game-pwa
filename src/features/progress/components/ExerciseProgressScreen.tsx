import type { AppSection } from '../../../components/layout';
import { AppShell } from '../../../components/layout';
import { Button } from '../../../components/ui';
import progressLogImage from '../../../assets/fitness/top-set-progress-log.jpg';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseAnalyticsSnapshot, ExercisePrTimelineEntry } from '../exerciseAnalytics';
import type { LiftingCalendarAnalytics } from '../liftingCalendarAnalytics';
import type { ExerciseProgressHistoryEntry, ExerciseProgressMetricType, ExerciseProgressSummary } from '../model';
import type { ExerciseProgressStatus } from '../hooks/useExerciseProgress';
import { ExerciseTrendChart } from './ExerciseTrendChart';
import { LiftingCalendarSummaryPanel } from './LiftingCalendarSummary';
import styles from './ExerciseProgressScreen.module.css';

interface ShellProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

interface ExerciseProgressScreenProps extends ShellProps {
  exercises: ExerciseProgressSummary[];
  selectedExercise: ExerciseProgressSummary | null;
  analytics: ExerciseAnalyticsSnapshot | null;
  history: ExerciseProgressHistoryEntry[];
  historyStatus: ExerciseProgressStatus;
  historyError: string;
  calendarAnalytics: LiftingCalendarAnalytics;
  calendarStatus: ExerciseProgressStatus;
  calendarError: string;
  onSelectExercise: (exerciseId: string) => void;
  onRetryHistory: () => void;
  onRetryCalendar: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('en-CA', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
  });
}

function metricLabel(metric: ExerciseProgressMetricType | null): string {
  if (metric === 'E1RM') return 'Epley e1RM';
  if (metric === 'BODYWEIGHT_REPS') return 'Bodyweight reps';
  return 'No comparable PR yet';
}

function metricTrendTitle(metric: ExerciseProgressMetricType | null): string {
  if (metric === 'E1RM') return 'e1RM trend';
  if (metric === 'BODYWEIGHT_REPS') return 'Rep trend';
  return 'Progress trend';
}

function formatMetric(metric: ExerciseProgressMetricType | null, value: number | null): string {
  if (value === null || metric === null) return '—';
  if (metric === 'E1RM') return `${formatNumber(value)} kg`;
  return `${Math.round(value)} reps`;
}

function bestSetDetail(metric: ExerciseProgressMetricType | null, weightKg: number | null, reps: number | null): string {
  if (metric === 'E1RM' && weightKg !== null && reps !== null) return `${formatNumber(weightKg)} kg × ${reps}`;
  if (metric === 'BODYWEIGHT_REPS' && reps !== null) return `${reps} bodyweight reps`;
  return 'Comparable best set unavailable';
}

function frequencyLabel(exercise: ExerciseProgressSummary): string {
  if (exercise.sessionCount <= 1 || exercise.averageDaysBetweenSessions === null) {
    return `${exercise.sessionCount} session${exercise.sessionCount === 1 ? '' : 's'}`;
  }
  return `${exercise.sessionCount} sessions · every ${formatNumber(exercise.averageDaysBetweenSessions)} days avg`;
}

function historyStatus(entry: ExerciseProgressHistoryEntry): string {
  if (entry.isCurrentPr) return 'Current PR';
  if (entry.isPr) return 'PR';
  if (entry.isBaseline) return 'Baseline';
  if (entry.metricValue !== null) return 'Comparable';
  if (entry.addedWeightSets > 0 || entry.assistedSets > 0) return 'Analytics only';
  return 'No comparable set';
}

function historyPerformance(entry: ExerciseProgressHistoryEntry): string {
  if (entry.metricValue !== null) {
    const metric = formatMetric(entry.metricType, entry.metricValue);
    const set = bestSetDetail(entry.metricType, entry.weightKg, entry.reps);
    return `${metric} · ${set}`;
  }
  if (entry.addedWeightSets > 0) {
    return `Added weight · ${entry.heaviestWeightKg === null ? 'load recorded' : `${formatNumber(entry.heaviestWeightKg)} kg max`}`;
  }
  if (entry.assistedSets > 0) return 'Assisted bodyweight work';
  return `${entry.maxCompletedReps ?? 0} reps max`;
}

function prKindLabel(entry: ExercisePrTimelineEntry): string {
  if (entry.kind === 'current-pr') return 'Current PR';
  if (entry.kind === 'pr') return 'PR';
  return 'Baseline';
}

function ExerciseList({ exercises, selectedExerciseId, onSelectExercise }: {
  exercises: ExerciseProgressSummary[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
}) {
  const totalSessions = exercises.reduce((total, exercise) => total + exercise.sessionCount, 0);

  return (
    <section className={styles.exercisePanel} aria-labelledby="tracked-exercises-heading">
      <div className={styles.panelHeading}>
        <div>
          <p>Exercise progress</p>
          <h2 id="tracked-exercises-heading">Tracked lifts</h2>
        </div>
        <span>{exercises.length} lifts · {totalSessions} sessions</span>
      </div>

      <div className={styles.exerciseList}>
        {exercises.map((exercise) => {
          const selected = exercise.exerciseId === selectedExerciseId;
          return (
            <button
              aria-pressed={selected}
              className={`${styles.exerciseButton}${selected ? ` ${styles.exerciseButtonSelected}` : ''}`}
              key={exercise.exerciseId}
              onClick={() => onSelectExercise(exercise.exerciseId)}
              type="button"
            >
              <span>
                <strong>{exercise.canonicalName}</strong>
                <small>{frequencyLabel(exercise)}</small>
              </span>
              <b>{formatMetric(exercise.metricType, exercise.bestValue)}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AnalyticsSummary({ exercise, analytics }: { exercise: ExerciseProgressSummary; analytics: ExerciseAnalyticsSnapshot }) {
  return (
    <>
      <dl className={styles.prSummary} aria-label="Personal record summary">
        <div className={styles.currentPr}>
          <dt>Current PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.bestValue)}</dd>
          <small>{bestSetDetail(exercise.metricType, exercise.bestWeightKg, exercise.bestReps)}</small>
        </div>
        <div>
          <dt>Previous PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.previousPrValue)}</dd>
          <small>{exercise.previousPrValue === null ? 'First baseline is still the best' : 'PR immediately before current best'}</small>
        </div>
      </dl>

      <dl className={styles.factStrip} aria-label="Exercise analytics facts">
        <div>
          <dt>Best weight</dt>
          <dd>{analytics.bestWeightKg === null ? '—' : `${formatNumber(analytics.bestWeightKg)} kg`}</dd>
        </div>
        <div>
          <dt>Best reps</dt>
          <dd>{analytics.bestReps === null ? '—' : analytics.bestReps}</dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{exercise.averageDaysBetweenSessions === null ? `${exercise.sessionCount} session${exercise.sessionCount === 1 ? '' : 's'}` : `${formatNumber(exercise.averageDaysBetweenSessions)} day avg`}</dd>
        </div>
        <div>
          <dt>Total volume</dt>
          <dd>{analytics.totalVolumeKgReps > 0 ? `${formatNumber(analytics.totalVolumeKgReps, 0)} kg·reps` : '—'}</dd>
        </div>
      </dl>
    </>
  );
}

function ExerciseCharts({ exercise, analytics }: { exercise: ExerciseProgressSummary; analytics: ExerciseAnalyticsSnapshot }) {
  const metricPoints = analytics.metricTrend.map((point) => ({ id: point.workoutId, observedAt: point.observedAt, value: point.value }));
  const volumePoints = analytics.volumeTrend.map((point) => ({ id: point.workoutId, observedAt: point.observedAt, value: point.value }));

  return (
    <div className={styles.chartGrid} aria-label="Exercise analytics charts">
      <ExerciseTrendChart
        description={`${metricPoints.length} comparable session${metricPoints.length === 1 ? '' : 's'}`}
        formatValue={(value) => formatMetric(exercise.metricType, value)}
        points={metricPoints}
        title={metricTrendTitle(exercise.metricType)}
      />
      <ExerciseTrendChart
        description={`${volumePoints.length} completed session${volumePoints.length === 1 ? '' : 's'} · analytics only`}
        formatValue={(value) => `${formatNumber(value, 0)} kg·reps`}
        points={volumePoints}
        title="Volume history"
        variant="bars"
      />
    </div>
  );
}

function PrTimeline({ entries }: { entries: ExercisePrTimelineEntry[] }) {
  return (
    <section className={styles.prTimeline} aria-labelledby="pr-timeline-heading">
      <div className={styles.historyHeading}>
        <div>
          <p>Milestones</p>
          <h3 id="pr-timeline-heading">PR timeline</h3>
        </div>
        <span>Comparable progression observations only.</span>
      </div>

      {entries.length === 0 ? (
        <p className={styles.stateText}>No comparable baseline or PR has been recorded yet.</p>
      ) : (
        <ol className={styles.prTimelineList}>
          {entries.map((entry) => (
            <li key={entry.workoutId}>
              <span className={styles.timelineDot} data-pr={entry.kind !== 'baseline'} aria-hidden="true" />
              <time dateTime={entry.observedAt}>{formatDate(entry.observedAt)}</time>
              <span className={entry.kind === 'baseline' ? styles.statusBadge : styles.prBadge}>{prKindLabel(entry)}</span>
              <strong>{formatMetric(entry.metricType, entry.metricValue)}</strong>
              <small>{bestSetDetail(entry.metricType, entry.weightKg, entry.reps)}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ExerciseDetail({ exercise, analytics, history, historyStatusValue, historyError, onRetryHistory }: {
  exercise: ExerciseProgressSummary;
  analytics: ExerciseAnalyticsSnapshot | null;
  history: ExerciseProgressHistoryEntry[];
  historyStatusValue: ExerciseProgressStatus;
  historyError: string;
  onRetryHistory: () => void;
}) {
  return (
    <section className={styles.detailPanel} aria-labelledby="exercise-detail-heading">
      <header className={styles.detailHeader}>
        <div>
          <p className={styles.kicker}>{metricLabel(exercise.metricType)}</p>
          <h2 id="exercise-detail-heading">{exercise.canonicalName}</h2>
          <span>Last performed {formatDate(exercise.lastPerformedAt)}</span>
        </div>
      </header>

      {historyStatusValue === 'loading' && <p className={styles.stateText}>Loading exercise analytics…</p>}
      {historyStatusValue === 'error' && (
        <div className={styles.inlineError} role="alert">
          <p>{historyError}</p>
          <Button onClick={onRetryHistory} variant="secondary">Retry history</Button>
        </div>
      )}

      {historyStatusValue === 'ready' && analytics && (
        <>
          <AnalyticsSummary analytics={analytics} exercise={exercise} />

          {exercise.measurementType === 'BODYWEIGHT_REPS' && (
            <p className={styles.ruleNote}>
              Added-weight and assisted sets stay visible as analytics, but they are not compared with plain bodyweight reps for PR or XP calculations.
            </p>
          )}

          <ExerciseCharts analytics={analytics} exercise={exercise} />
          <PrTimeline entries={analytics.prTimeline} />

          <div className={styles.historyHeading}>
            <div>
              <p>Lift by lift</p>
              <h3>Session history</h3>
            </div>
            <span>{exercise.observationCount} comparable observation{exercise.observationCount === 1 ? '' : 's'} · volume is analytics-only.</span>
          </div>

          {history.length === 0 ? (
            <p className={styles.stateText}>No completed session history is available yet.</p>
          ) : (
            <ol className={styles.historyList}>
              {history.map((entry) => (
                <li key={entry.workoutId}>
                  <div className={styles.historyPrimary}>
                    <div className={styles.historyTopline}>
                      <time dateTime={entry.observedAt}>{formatDate(entry.observedAt)}</time>
                      <span className={entry.isCurrentPr || entry.isPr ? styles.prBadge : styles.statusBadge}>{historyStatus(entry)}</span>
                    </div>
                    <strong>{historyPerformance(entry)}</strong>
                    {entry.previousPrValue !== null && entry.metricValue !== null && (
                      <small>Previous best: {formatMetric(entry.metricType, entry.previousPrValue)}</small>
                    )}
                  </div>
                  <div className={styles.historyAnalytics}>
                    <span>{entry.completedWorkingSets} working sets</span>
                    <span>{entry.sessionVolumeKgReps > 0 ? `${formatNumber(entry.sessionVolumeKgReps, 0)} kg·reps volume` : 'No weighted volume'}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

export function ExerciseProgressScreen({
  exercises,
  selectedExercise,
  analytics,
  history,
  historyStatus,
  historyError,
  calendarAnalytics,
  calendarStatus,
  calendarError,
  onSelectExercise,
  onRetryHistory,
  onRetryCalendar,
  profile,
  onNavigate,
  onSignOut,
}: ExerciseProgressScreenProps) {
  return (
    <AppShell activeItem="progress" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.progressPage}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p>Lifting analytics</p>
            <h1>Your lifting trend</h1>
            <span>Strength, volume, frequency, and PR history from your completed sessions. Analytics never changes XP.</span>
          </div>
          <img alt="Training log beside a loaded barbell" className={styles.heroImage} src={progressLogImage} />
        </header>

        <LiftingCalendarSummaryPanel
          analytics={calendarAnalytics}
          error={calendarError}
          onRetry={onRetryCalendar}
          status={calendarStatus}
        />

        {exercises.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No lift history yet</h2>
            <p>Complete a strength session with working sets and your exercise analytics will appear here automatically.</p>
            <Button onClick={() => onNavigate('workouts')}>Start Lift</Button>
          </section>
        ) : (
          <div className={styles.progressGrid}>
            <ExerciseList exercises={exercises} onSelectExercise={onSelectExercise} selectedExerciseId={selectedExercise?.exerciseId ?? null} />
            {selectedExercise && (
              <ExerciseDetail
                analytics={analytics}
                exercise={selectedExercise}
                history={history}
                historyError={historyError}
                historyStatusValue={historyStatus}
                onRetryHistory={onRetryHistory}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function ExerciseProgressLoading({ profile, onNavigate, onSignOut }: ShellProps) {
  return (
    <AppShell activeItem="progress" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.statePage}>
        <p>Loading your lifting analytics…</p>
      </div>
    </AppShell>
  );
}

export function ExerciseProgressError({ profile, onNavigate, onSignOut, message, onRetry }: ShellProps & { message: string; onRetry: () => void }) {
  return (
    <AppShell activeItem="progress" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.statePage} role="alert">
        <h1>Progress unavailable</h1>
        <p>{message}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </AppShell>
  );
}
