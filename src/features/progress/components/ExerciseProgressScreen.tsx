import type { AppSection } from '../../../components/layout';
import { AppShell, PageHeader } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseProgressHistoryEntry, ExerciseProgressMetricType, ExerciseProgressSummary } from '../model';
import type { ExerciseProgressStatus } from '../hooks/useExerciseProgress';
import styles from './ExerciseProgressScreen.module.css';

interface ShellProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

interface ExerciseProgressScreenProps extends ShellProps {
  exercises: ExerciseProgressSummary[];
  selectedExercise: ExerciseProgressSummary | null;
  history: ExerciseProgressHistoryEntry[];
  historyStatus: ExerciseProgressStatus;
  historyError: string;
  onSelectExercise: (exerciseId: string) => void;
  onRetryHistory: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('en-CA', { maximumFractionDigits: digits, minimumFractionDigits: Number.isInteger(value) ? 0 : digits });
}

function metricLabel(metric: ExerciseProgressMetricType | null): string {
  if (metric === 'E1RM') return 'Epley e1RM';
  if (metric === 'BODYWEIGHT_REPS') return 'Bodyweight reps';
  return 'No comparable PR yet';
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
  if (exercise.sessionCount <= 1 || exercise.averageDaysBetweenSessions === null) return `${exercise.sessionCount} session${exercise.sessionCount === 1 ? '' : 's'}`;
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

function ExerciseList({ exercises, selectedExerciseId, onSelectExercise }: {
  exercises: ExerciseProgressSummary[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
}) {
  return (
    <section className={styles.exercisePanel} aria-labelledby="tracked-exercises-heading">
      <div className={styles.panelHeading}>
        <p>Exercise library</p>
        <h2 id="tracked-exercises-heading">Tracked lifts</h2>
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

function ExerciseDetail({ exercise, history, historyStatusValue, historyError, onRetryHistory }: {
  exercise: ExerciseProgressSummary;
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

      <dl className={styles.prGrid}>
        <div>
          <dt>Current PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.bestValue)}</dd>
          <small>{bestSetDetail(exercise.metricType, exercise.bestWeightKg, exercise.bestReps)}</small>
        </div>
        <div>
          <dt>Previous PR</dt>
          <dd>{formatMetric(exercise.metricType, exercise.previousPrValue)}</dd>
          <small>{exercise.previousPrValue === null ? 'First baseline is still the best' : 'PR immediately before current best'}</small>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{exercise.sessionCount}</dd>
          <small>{exercise.averageDaysBetweenSessions === null ? 'One completed session' : `Every ${formatNumber(exercise.averageDaysBetweenSessions)} days on average`}</small>
        </div>
        <div>
          <dt>Comparable observations</dt>
          <dd>{exercise.observationCount}</dd>
          <small>{exercise.observationCount === exercise.sessionCount ? 'All tracked sessions comparable' : `${exercise.sessionCount - exercise.observationCount} session(s) analytics-only`}</small>
        </div>
      </dl>

      {exercise.measurementType === 'BODYWEIGHT_REPS' && (
        <p className={styles.ruleNote}>
          Added-weight and assisted sets stay visible as analytics, but they are not compared with plain bodyweight reps for PR or XP calculations.
        </p>
      )}

      <div className={styles.historyHeading}>
        <div>
          <p>Progression timeline</p>
          <h3>Session history</h3>
        </div>
        <span>Volume is analytics-only and never awards XP.</span>
      </div>

      {historyStatusValue === 'loading' && <p className={styles.stateText}>Loading exercise history…</p>}
      {historyStatusValue === 'error' && (
        <div className={styles.inlineError} role="alert">
          <p>{historyError}</p>
          <Button onClick={onRetryHistory} variant="secondary">Retry history</Button>
        </div>
      )}
      {historyStatusValue === 'ready' && history.length === 0 && <p className={styles.stateText}>No completed session history is available yet.</p>}
      {historyStatusValue === 'ready' && history.length > 0 && (
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
    </section>
  );
}

export function ExerciseProgressScreen({
  exercises,
  selectedExercise,
  history,
  historyStatus,
  historyError,
  onSelectExercise,
  onRetryHistory,
  profile,
  onNavigate,
  onSignOut,
}: ExerciseProgressScreenProps) {
  const totalExerciseSessions = exercises.reduce((total, exercise) => total + exercise.sessionCount, 0);
  const comparable = exercises.filter((exercise) => exercise.metricType !== null).length;

  return (
    <AppShell activeItem="progress" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.progressPage}>
        <PageHeader
          eyebrow="Progress"
          title="Your lift history"
          description="Track your own best performances over time. Progression is always personal—never compared against another lifter."
        />

        <section className={styles.summary} aria-label="Progress summary">
          <div><span>Tracked exercises</span><strong>{exercises.length}</strong></div>
          <div><span>Exercise sessions</span><strong>{totalExerciseSessions}</strong></div>
          <div><span>Comparable lifts</span><strong>{comparable}</strong></div>
        </section>

        {exercises.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No lift history yet</h2>
            <p>Complete a strength session with working sets and your exercise progression will appear here automatically.</p>
            <Button onClick={() => onNavigate('workouts')}>Start Lift</Button>
          </section>
        ) : (
          <div className={styles.progressGrid}>
            <ExerciseList exercises={exercises} onSelectExercise={onSelectExercise} selectedExerciseId={selectedExercise?.exerciseId ?? null} />
            {selectedExercise && (
              <ExerciseDetail
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
        <p>Loading your exercise progression…</p>
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
