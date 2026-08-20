import { useEffect, useState, type ReactNode } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, ExercisePickerItem, WorkoutCompositionAction, WorkoutExercise, WorkoutLifecycleAction } from '../model';
import type { WorkoutExerciseStatus } from '../hooks/useWorkoutExercises';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from '../workoutTime';
import { ExercisePicker } from './ExercisePicker';
import styles from './WorkoutSessionScreen.module.css';

interface SharedProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  error: string;
  busyAction: WorkoutLifecycleAction;
}

interface StartProps extends SharedProps {
  onStart: () => Promise<unknown>;
}

interface ActiveProps extends SharedProps {
  workout: ActiveWorkoutSession;
  exercises: WorkoutExercise[];
  exerciseCatalog: ExercisePickerItem[];
  exerciseStatus: WorkoutExerciseStatus;
  exercisePickerStatus: ExercisePickerStatus;
  compositionBusyAction: WorkoutCompositionAction;
  compositionError: string;
  exercisePickerError: string;
  onRetryExercises: () => Promise<WorkoutExercise[]>;
  onAddExercise: (exerciseId: string) => Promise<boolean>;
  onMoveExercise: (workoutExerciseId: string, newOrderIndex: number) => Promise<boolean>;
  onRemoveExercise: (workoutExerciseId: string) => Promise<boolean>;
  onRetryExercisePicker: () => Promise<ExercisePickerItem[]>;
  onPause: () => Promise<unknown>;
  onResume: () => Promise<unknown>;
  onFinish: () => Promise<unknown>;
  onCancel: () => Promise<unknown>;
}

function WorkoutShell({ profile, onNavigate, onSignOut, children }: SharedProps & { children: ReactNode }) {
  return (
    <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      {children}
    </AppShell>
  );
}

function useWorkoutClock(workout: ActiveWorkoutSession): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (workout.pausedAt) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [workout.id, workout.pausedAt, workout.lastResumedAt]);
  return elapsedWorkoutSeconds(workout, now);
}

function measurementLabel(exercise: WorkoutExercise): string {
  switch (exercise.measurementType) {
    case 'WEIGHT_REPS': return 'Weight + reps';
    case 'BODYWEIGHT_REPS': return 'Bodyweight reps';
    case 'DURATION': return 'Duration';
    default: return 'Tracked exercise';
  }
}

export function WorkoutStartScreen(props: StartProps) {
  return (
    <WorkoutShell {...props}>
      <main className={styles.start}>
        <p className={styles.kicker}>WORKOUT</p>
        <h1>Start a lift</h1>
        <p>Start the session now. If a workout is already active on your account, this resumes it instead of creating a duplicate.</p>
        {props.error && <p className={styles.error} role="alert">{props.error}</p>}
        <Button disabled={props.busyAction !== null} onClick={() => void props.onStart()}>
          {props.busyAction === 'start' ? 'Starting…' : 'Start Lift'}
        </Button>
      </main>
    </WorkoutShell>
  );
}

export function ActiveWorkoutScreen(props: ActiveProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const seconds = useWorkoutClock(props.workout);
  const isPaused = props.workout.pausedAt !== null;
  const lifecycleBusy = props.busyAction !== null;
  const compositionBusy = props.compositionBusyAction !== null;

  return (
    <WorkoutShell {...props}>
      <main className={styles.active}>
        <header className={styles.activeHeader}>
          <div>
            <p className={styles.kicker}>ACTIVE LIFT</p>
            <h1>{isPaused ? 'Workout paused' : 'Workout in progress'}</h1>
          </div>
          <time className={styles.timer} dateTime={`PT${seconds}S`}>{formatWorkoutDuration(seconds)}</time>
        </header>

        <section className={styles.sessionMeta} aria-label="Workout session state">
          <div><span>Started</span><strong>{new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(props.workout.startedAt))}</strong></div>
          <div><span>Scoring date</span><strong>{props.workout.scoringDate}</strong></div>
          <div><span>Timer</span><strong>{isPaused ? 'Paused' : 'Running'}</strong></div>
        </section>

        <section className={styles.exerciseStage} aria-labelledby="workout-exercises-heading">
          <div className={styles.exerciseHeading}>
            <div>
              <p className={styles.kicker}>EXERCISES</p>
              <h2 id="workout-exercises-heading">{props.exercises.length > 0 ? `${props.exercises.length} in this lift` : 'No exercises yet'}</h2>
            </div>
            <div className={styles.exerciseHeadingActions}>
              {props.exercises.length > 0 && <span className={styles.exerciseCount}>{props.exercises.length}</span>}
              <button className={styles.addExerciseButton} onClick={() => setPickerOpen(true)} type="button">Add exercise</button>
            </div>
          </div>

          {props.exerciseStatus === 'loading' && <p className={styles.exerciseMessage} role="status">Loading exercises…</p>}

          {props.exerciseStatus === 'error' && (
            <div className={styles.exerciseError}>
              <p role="alert">{props.compositionError || 'Unable to load workout exercises.'}</p>
              <button type="button" onClick={() => void props.onRetryExercises()}>Try again</button>
            </div>
          )}

          {props.exerciseStatus === 'ready' && props.exercises.length === 0 && (
            <p className={styles.exerciseMessage}>Your exercise list is empty. Session state stays saved while you build the lift.</p>
          )}

          {props.exerciseStatus === 'ready' && props.exercises.length > 0 && (
            <ol className={styles.exerciseList}>
              {props.exercises.map((exercise, index) => (
                <li className={styles.exerciseRow} key={exercise.id}>
                  <span className={styles.exerciseIndex} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div className={styles.exerciseIdentity}>
                    <strong>{exercise.canonicalName}</strong>
                    <span>{measurementLabel(exercise)}</span>
                  </div>
                  <div className={styles.exerciseActions}>
                    <button
                      aria-label={`Move ${exercise.canonicalName} up`}
                      disabled={compositionBusy || index === 0}
                      onClick={() => void props.onMoveExercise(exercise.id, index - 1)}
                      type="button"
                    >↑</button>
                    <button
                      aria-label={`Move ${exercise.canonicalName} down`}
                      disabled={compositionBusy || index === props.exercises.length - 1}
                      onClick={() => void props.onMoveExercise(exercise.id, index + 1)}
                      type="button"
                    >↓</button>
                    <button
                      aria-label={`Remove ${exercise.canonicalName}`}
                      className={styles.removeExercise}
                      disabled={compositionBusy}
                      onClick={() => void props.onRemoveExercise(exercise.id)}
                      type="button"
                    >Remove</button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {props.compositionError && props.exerciseStatus !== 'error' && <p className={styles.error} role="alert">{props.compositionError}</p>}
        </section>

        <ExercisePicker
          catalog={props.exerciseCatalog}
          error={props.exercisePickerError}
          isAdding={props.compositionBusyAction === 'add'}
          onAdd={props.onAddExercise}
          onClose={() => setPickerOpen(false)}
          onRetry={props.onRetryExercisePicker}
          open={pickerOpen}
          selectedExerciseIds={props.exercises.map((exercise) => exercise.exerciseId)}
          status={props.exercisePickerStatus}
        />

        {props.error && <p className={styles.error} role="alert">{props.error}</p>}

        <div className={styles.primaryActions}>
          {isPaused ? (
            <Button disabled={lifecycleBusy} onClick={() => void props.onResume()}>{props.busyAction === 'resume' ? 'Resuming…' : 'Resume timer'}</Button>
          ) : (
            <Button disabled={lifecycleBusy} onClick={() => void props.onPause()} variant="secondary">{props.busyAction === 'pause' ? 'Pausing…' : 'Pause timer'}</Button>
          )}
          <Button disabled={lifecycleBusy} onClick={() => void props.onFinish()}>{props.busyAction === 'finish' ? 'Finishing…' : 'Finish workout'}</Button>
        </div>

        <button className={styles.cancelButton} disabled={lifecycleBusy} onClick={() => void props.onCancel()} type="button">
          {props.busyAction === 'cancel' ? 'Cancelling…' : 'Cancel workout'}
        </button>
      </main>
    </WorkoutShell>
  );
}
