import type { OnboardingProfile } from '../../onboarding';
import { Button } from '../../../components/ui';
import { kgToDisplayWeight, weightUnitLabel } from '../weightUnits';
import { formatWorkoutDuration } from '../workoutTime';
import {
  buildWorkoutHistoryBlocks,
  type WorkoutHistoryExercise,
  type WorkoutHistorySession,
  type WorkoutHistorySet,
  type WorkoutHistoryStatus,
} from '../workoutHistoryModel';
import styles from './WorkoutHistoryPanel.module.css';

interface WorkoutHistoryPanelProps {
  profile: OnboardingProfile;
  status: WorkoutHistoryStatus;
  history: WorkoutHistorySession[];
  error: string;
  onRetry: () => Promise<unknown> | unknown;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

function setTypeLabel(value: WorkoutHistorySet['setType']): string {
  if (value === 'WARMUP') return 'Warm-up';
  if (value === 'DROP') return 'Drop';
  if (value === 'FAILURE') return 'Failure';
  return 'Working';
}

function formatWeight(weightKg: number, profile: OnboardingProfile): string {
  const value = kgToDisplayWeight(weightKg, profile.preferredWeightUnit);
  return `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} ${weightUnitLabel(profile.preferredWeightUnit)}`;
}

function setPerformance(set: WorkoutHistorySet, profile: OnboardingProfile): string {
  const reps = set.reps ?? 0;

  if (set.bodyweightMode === 'BODYWEIGHT') {
    return reps > 0 ? `BW × ${reps}` : 'Bodyweight';
  }

  if (set.bodyweightMode === 'ADDED_WEIGHT') {
    return set.weightKg === null
      ? `${reps} reps`
      : `+${formatWeight(set.weightKg, profile)} × ${reps}`;
  }

  if (set.bodyweightMode === 'ASSISTED') {
    return set.weightKg === null
      ? `Assisted × ${reps}`
      : `${formatWeight(set.weightKg, profile)} assist × ${reps}`;
  }

  if (set.weightKg !== null && set.reps !== null) {
    return `${formatWeight(set.weightKg, profile)} × ${set.reps}`;
  }

  if (set.reps !== null) return `${set.reps} reps`;
  if (set.weightKg !== null) return formatWeight(set.weightKg, profile);
  return 'Completed';
}

function ExerciseHistory({
  exercise,
  marker,
  profile,
}: {
  exercise: WorkoutHistoryExercise;
  marker?: string;
  profile: OnboardingProfile;
}) {
  return (
    <article className={styles.exercise}>
      <header>
        <div>
          {marker && <span className={styles.marker}>{marker}</span>}
          <strong>{exercise.canonicalName}</strong>
        </div>
        <small>{exercise.sets.length} completed set{exercise.sets.length === 1 ? '' : 's'}</small>
      </header>

      {exercise.sets.length === 0 ? (
        <p className={styles.noSets}>No completed sets were recorded.</p>
      ) : (
        <ul className={styles.sets}>
          {exercise.sets.map((set) => (
            <li key={set.id}>
              <span>Set {set.setNumber} · {setTypeLabel(set.setType)}</span>
              <strong>{setPerformance(set, profile)}</strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function WorkoutHistoryPanel({
  profile,
  status,
  history,
  error,
  onRetry,
}: WorkoutHistoryPanelProps) {
  return (
    <section
      className={styles.history}
      aria-labelledby="lifting-history-heading"
      data-app-surface="category"
      data-workout-history
    >
      <div className={styles.heading}>
        <div>
          <p>HISTORY</p>
          <h2 id="lifting-history-heading">Recent lifting</h2>
        </div>
        <span>Completed sessions keep their original Superset structure.</span>
      </div>

      {status === 'loading' && (
        <p className={styles.state} role="status">Loading lifting history…</p>
      )}

      {status === 'error' && (
        <div className={styles.error} role="alert">
          <p>{error || 'Lifting history is unavailable right now.'}</p>
          <Button variant="secondary" onClick={() => void onRetry()}>Retry history</Button>
        </div>
      )}

      {status === 'ready' && history.length === 0 && (
        <p className={styles.state}>Complete a lifting session and it will appear here.</p>
      )}

      {status === 'ready' && history.length > 0 && (
        <div className={styles.sessions}>
          {history.map((session, sessionIndex) => {
            const blocks = buildWorkoutHistoryBlocks(session.exercises);
            return (
              <details className={styles.session} key={session.id} open={sessionIndex === 0}>
                <summary>
                  <span>
                    <strong>{dateLabel(session.scoringDate)}</strong>
                    <small>{session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'}</small>
                  </span>
                  <b>{formatWorkoutDuration(session.activeDurationSeconds)}</b>
                </summary>

                <div className={styles.sessionBody}>
                  {blocks.length === 0 ? (
                    <p className={styles.state}>No completed exercises were recorded.</p>
                  ) : blocks.map((block) => (
                    block.kind === 'exercise' ? (
                      <ExerciseHistory
                        exercise={block.exercise}
                        key={block.exercise.id}
                        profile={profile}
                      />
                    ) : (
                      <section
                        aria-label={`Superset ${block.label}`}
                        className={styles.superset}
                        key={block.groupId}
                      >
                        <header className={styles.supersetHeading}>
                          <strong>Superset {block.label}</strong>
                          <span>{block.exercises.length} exercises</span>
                        </header>
                        <div className={styles.supersetMembers}>
                          {block.exercises.map((exercise, index) => (
                            <ExerciseHistory
                              exercise={exercise}
                              key={exercise.id}
                              marker={`${block.label}${index + 1}`}
                              profile={profile}
                            />
                          ))}
                        </div>
                      </section>
                    )
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
