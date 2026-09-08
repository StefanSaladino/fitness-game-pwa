import { useState } from 'react';
import progressBanner from '../../../assets/fitness/top-set-progress-log.jpg';
import type { AppSection } from '../../../components/layout';
import { AppShell, DestinationBanner } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { WeightDisplayUnit } from '../../workout/model';
import { kgToDisplayWeight, weightUnitLabel } from '../../workout/weightUnits';
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

function formatWeight(valueKg: number, displayUnit: WeightDisplayUnit, digits = 1): string {
  return `${formatNumber(kgToDisplayWeight(valueKg, displayUnit), digits)} ${weightUnitLabel(displayUnit)}`;
}

function formatVolume(valueKgReps: number, displayUnit: WeightDisplayUnit): string {
  return `${formatNumber(kgToDisplayWeight(valueKgReps, displayUnit), 0)} ${weightUnitLabel(displayUnit)}·reps`;
}

function formatMetric(metric: ExerciseProgressMetricType | null, value: number | null, displayUnit: WeightDisplayUnit): string {
  if (value === null || metric === null) return '—';
  if (metric === 'E1RM') return formatWeight(value, displayUnit);
  return `${Math.round(value)} reps`;
}

function bestSetDetail(
  metric: ExerciseProgressMetricType | null,
  weightKg: number | null,
  reps: number | null,
  displayUnit: WeightDisplayUnit,
): string {
  if (metric === 'E1RM' && weightKg !== null && reps !== null) return `${formatWeight(weightKg, displayUnit)} × ${reps}`;
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

function historyPerformance(entry: ExerciseProgressHistoryEntry, displayUnit: WeightDisplayUnit): string {
  if (entry.metricValue !== null) {
    const metric = formatMetric(entry.metricType, entry.metricValue, displayUnit);
    const set = bestSetDetail(entry.metricType, entry.weightKg, entry.reps, displayUnit);
    return `${metric} · ${set}`;
  }
  if (entry.addedWeightSets > 0) {
    return `Added weight · ${entry.heaviestWeightKg === null ? 'load recorded' : `${formatWeight(entry.heaviestWeightKg, displayUnit)} max`}`;
  }
  if (entry.assistedSets > 0) return 'Assisted bodyweight work';
  return `${entry.maxCompletedReps ?? 0} reps max`;
}

function prKindLabel(entry: ExercisePrTimelineEntry): string {
  if (entry.kind === 'current-pr') return 'Current PR';
  if (entry.kind === 'pr') return 'PR';
  return 'Baseline';
}

function ExerciseList({ exercises, selectedExerciseId, onSelectExercise, displayUnit }: {
  exercises: ExerciseProgressSummary[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
  displayUnit: WeightDisplayUnit;
}) {
  const totalSessions = exercises.reduce((total, exercise) => total + exercise.sessionCount, 0);

  return (
    <section
      className={styles.exercisePanel}
      aria-labelledby="tracked-exercises-heading"
      data-app-surface="category"
      data-progress-surface="lift-picker"
    >
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
              <b>{formatMetric(exercise.metricType, exercise.bestValue, displayUnit)}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AnalyticsSummary({ exercise, analytics, displayUnit }: {
  exercise: ExerciseProgressSummary;
  analytics: ExerciseAnalyticsSnapshot;
  displayUnit: WeightDisplayUnit;
}) {
  return (
    <>
      <dl className={styles.prSummary} aria-label="Personal record summary">
        <div className={styles.currentPr}>
          <dt>Current PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.bestValue, displayUnit)}</dd>
          <small>{bestSetDetail(exercise.metricType, exercise.bestWeightKg, exercise.bestReps, displayUnit)}</small>
        </div>
        <div>
          <dt>Previous PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.previousPrValue, displayUnit)}</dd>
          <small>{exercise.previousPrValue === null ? 'First baseline is still the best' : 'PR immediately before current best'}</small>
        </div>
      </dl>

      <dl className={styles.factStrip} aria-label="Exercise analytics facts">
        <div>
          <dt>Best weight</dt>
          <dd>{analytics.bestWeightKg === null ? '—' : formatWeight(analytics.bestWeightKg, displayUnit)}</dd>
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
          <dd>{analytics.totalVolumeKgReps > 0 ? formatVolume(analytics.totalVolumeKgReps, displayUnit) : '—'}</dd>
        </div>
      </dl>
    </>
  );
}

function ExerciseCharts({ exercise, analytics, displayUnit }: {
  exercise: ExerciseProgressSummary;
  analytics: ExerciseAnalyticsSnapshot;
  displayUnit: WeightDisplayUnit;
}) {
  const metricPoints = analytics.metricTrend.map((point) => ({ id: point.workoutId, observedAt: point.observedAt, value: point.value }));
  const volumePoints = analytics.volumeTrend.map((point) => ({ id: point.workoutId, observedAt: point.observedAt, value: point.value }));

  return (
    <section
      className={styles.trendsPanel}
      aria-labelledby="exercise-trends-heading"
      data-app-surface="category"
      data-progress-surface="trends"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p>Completed sessions</p>
          <h3 id="exercise-trends-heading">Exercise trends</h3>
        </div>
        <span>Comparable progress and analytics-only volume are kept separate.</span>
      </div>
      <div className={styles.chartGrid} aria-label="Exercise analytics charts">
        <ExerciseTrendChart
          description={`${metricPoints.length} comparable session${metricPoints.length === 1 ? '' : 's'}`}
          formatValue={(value) => formatMetric(exercise.metricType, value, displayUnit)}
          points={metricPoints}
          title={metricTrendTitle(exercise.metricType)}
        />
        <ExerciseTrendChart
          description={`${volumePoints.length} completed session${volumePoints.length === 1 ? '' : 's'} · analytics only`}
          formatValue={(value) => formatVolume(value, displayUnit)}
          points={volumePoints}
          title="Volume history"
          variant="bars"
        />
      </div>
    </section>
  );
}

function PrTimeline({ entries, displayUnit }: {
  entries: ExercisePrTimelineEntry[];
  displayUnit: WeightDisplayUnit;
}) {
  return (
    <section
      className={styles.prTimeline}
      aria-labelledby="pr-timeline-heading"
      data-app-surface="category"
      data-progress-surface="milestones"
    >
      <div className={styles.sectionHeading}>
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
              <strong>{formatMetric(entry.metricType, entry.metricValue, displayUnit)}</strong>
              <small>{bestSetDetail(entry.metricType, entry.weightKg, entry.reps, displayUnit)}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ExerciseDetail({ exercise, analytics, history, historyStatusValue, historyError, onRetryHistory, displayUnit }: {
  exercise: ExerciseProgressSummary;
  analytics: ExerciseAnalyticsSnapshot | null;
  history: ExerciseProgressHistoryEntry[];
  historyStatusValue: ExerciseProgressStatus;
  historyError: string;
  onRetryHistory: () => void;
  displayUnit: WeightDisplayUnit;
}) {
  return (
    <div className={styles.detailStack} data-progress-detail>
      <section
        className={styles.summaryPanel}
        aria-labelledby="exercise-detail-heading"
        data-app-surface="category"
        data-progress-surface="exercise-summary"
      >
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
          <AnalyticsSummary analytics={analytics} displayUnit={displayUnit} exercise={exercise} />

          {exercise.measurementType === 'BODYWEIGHT_REPS' && (
            <p className={styles.ruleNote}>
              Added-weight and assisted sets stay visible as analytics, but they are not compared with plain bodyweight reps for PR or XP calculations.
            </p>
          )}
          </>
        )}
      </section>

      {historyStatusValue === 'ready' && analytics && (
        <>
          <ExerciseCharts analytics={analytics} displayUnit={displayUnit} exercise={exercise} />
          <PrTimeline displayUnit={displayUnit} entries={analytics.prTimeline} />

          <section
            className={styles.historyPanel}
            aria-labelledby="session-history-heading"
            data-app-surface="category"
            data-progress-surface="history"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p>Lift by lift</p>
                <h3 id="session-history-heading">Session history</h3>
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
                      <strong>{historyPerformance(entry, displayUnit)}</strong>
                      {entry.previousPrValue !== null && entry.metricValue !== null && (
                        <small>Previous best: {formatMetric(entry.metricType, entry.previousPrValue, displayUnit)}</small>
                      )}
                    </div>
                    <div className={styles.historyAnalytics}>
                      <span>{entry.completedWorkingSets} working sets</span>
                      <span>{entry.sessionVolumeKgReps > 0 ? `${formatVolume(entry.sessionVolumeKgReps, displayUnit)} volume` : 'No weighted volume'}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
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
  const [displayUnit, setDisplayUnit] = useState<WeightDisplayUnit>(profile.preferredWeightUnit);

  return (
    <AppShell activeItem="progress" mobileTitle="Progress" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.progressPage} data-progress-page>
        <DestinationBanner className={styles.pageHeader} data-progress-surface="identity" imagePosition="center 43%" imageSrc={progressBanner}>
          <div className={styles.headerCopy}>
            <p>Lifting analytics</p>
            <h1>Your lifting trend</h1>
            <span>Strength, volume, frequency, and PR history from your completed sessions. Analytics never changes XP.</span>
          </div>
          <div aria-label="Progress weight unit" className={styles.unitControl} role="group">
            <span>Display</span>
            <button aria-pressed={displayUnit === 'KG'} onClick={() => setDisplayUnit('KG')} type="button">kg</button>
            <button aria-pressed={displayUnit === 'LB'} onClick={() => setDisplayUnit('LB')} type="button">lb</button>
          </div>
        </DestinationBanner>

        <LiftingCalendarSummaryPanel
          analytics={calendarAnalytics}
          displayUnit={displayUnit}
          error={calendarError}
          onRetry={onRetryCalendar}
          status={calendarStatus}
        />

        {exercises.length === 0 ? (
          <section className={styles.emptyState} data-app-surface="category" data-progress-surface="empty">
            <h2>No lift history yet</h2>
            <p>Complete a strength session with working sets and your exercise analytics will appear here automatically.</p>
            <Button onClick={() => onNavigate('workouts')}>Start Lift</Button>
          </section>
        ) : (
          <div className={styles.progressGrid}>
            <ExerciseList
              displayUnit={displayUnit}
              exercises={exercises}
              onSelectExercise={onSelectExercise}
              selectedExerciseId={selectedExercise?.exerciseId ?? null}
            />
            {selectedExercise && (
              <ExerciseDetail
                analytics={analytics}
                displayUnit={displayUnit}
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
