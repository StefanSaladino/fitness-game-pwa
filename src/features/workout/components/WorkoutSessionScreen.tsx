import { useEffect, useState, type ReactNode } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, ExercisePickerItem, WeightDisplayUnit, WorkoutCompositionAction, WorkoutExercise, WorkoutLifecycleAction, WorkoutSet, WorkoutSetInput, WorkoutSetType } from '../model';
import type { WorkoutRecoverySetDraft, WorkoutRecoveryState } from '../recovery/workoutRecoveryModel';
import type { WorkoutExerciseStatus } from '../hooks/useWorkoutExercises';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
import type { WorkoutSetBusyState, WorkoutSetStatus } from '../hooks/useWorkoutSets';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from '../workoutTime';
import { ExercisePicker } from './ExercisePicker';
import { WorkoutSetList } from './WorkoutSetList';
import styles from './WorkoutSessionScreen.module.css';

interface SharedProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  error: string;
  busyAction: WorkoutLifecycleAction;
}

interface StartProps extends SharedProps {
  onStart: (actionAtMs?: number) => Promise<unknown>;
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
  workoutSets: WorkoutSet[];
  setStatus: WorkoutSetStatus;
  setBusy: WorkoutSetBusyState | null;
  setError: string;
  onRetrySets: () => Promise<WorkoutSet[]>;
  onAddSet: (workoutExerciseId: string, setType?: WorkoutSetType) => Promise<boolean>;
  onCopySet: (workoutSetId: string) => Promise<boolean>;
  onSaveSet: (workoutSetId: string, input: WorkoutSetInput) => Promise<boolean>;
  onRemoveSet: (workoutSetId: string) => Promise<boolean>;
  onPause: (actionAtMs?: number) => Promise<unknown>;
  onResume: (actionAtMs?: number) => Promise<unknown>;
  onFinish: () => Promise<unknown>;
  onCancel: () => Promise<unknown>;
  recoveryState?: WorkoutRecoveryState;
  recoveryDrafts?: Record<string, WorkoutRecoverySetDraft>;
  initialWeightUnit?: WeightDisplayUnit;
  onSetDraftChange?: (workoutSetId: string, draft: WorkoutRecoverySetDraft) => void;
  onSetDraftPersisted?: (workoutSetId: string) => void;
  onWeightUnitChange?: (unit: WeightDisplayUnit) => void;
}

function WorkoutShell({ profile, onNavigate, onSignOut, children }: SharedProps & { children: ReactNode }) {
  return (
    <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      {children}
    </AppShell>
  );
}

function useStartingClock(startingAtMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startingAtMs === null) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [startingAtMs]);
  if (startingAtMs === null) return 0;
  return Math.max(0, Math.floor((now - startingAtMs) / 1000));
}

function useWorkoutClock(workout: ActiveWorkoutSession, pauseIntentAtMs: number | null, resumeIntentAtMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  const locallyRunningFromResume = resumeIntentAtMs !== null && workout.pausedAt !== null;
  const locallyFrozenAtPause = pauseIntentAtMs !== null && workout.pausedAt === null;
  const shouldTick = locallyRunningFromResume || (!workout.pausedAt && !locallyFrozenAtPause);

  useEffect(() => {
    if (!shouldTick) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [workout.id, workout.pausedAt, workout.lastResumedAt, shouldTick, resumeIntentAtMs]);

  if (locallyFrozenAtPause) return elapsedWorkoutSeconds(workout, pauseIntentAtMs);
  if (locallyRunningFromResume) {
    const persisted = Math.max(0, Math.floor(workout.activeDurationSeconds));
    return persisted + Math.max(0, Math.floor((now - resumeIntentAtMs) / 1000));
  }
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
  const [startingAtMs, setStartingAtMs] = useState<number | null>(null);
  const startingSeconds = useStartingClock(startingAtMs);

  useEffect(() => {
    if (startingAtMs !== null && props.busyAction !== 'start' && props.error) setStartingAtMs(null);
  }, [props.busyAction, props.error, startingAtMs]);

  const startNow = () => {
    const actionAtMs = Date.now();
    setStartingAtMs(actionAtMs);
    void props.onStart(actionAtMs);
  };

  return (
    <WorkoutShell {...props}>
      <main className={styles.start}>
        <p className={styles.kicker}>WORKOUT</p>
        <h1>Start a lift</h1>
        <p>Start the session now. If a workout is already active on your account, this resumes it instead of creating a duplicate.</p>
        {startingAtMs !== null && (
          <div className={styles.startingClock} role="status">
            <span>Starting workout</span>
            <time dateTime={`PT${startingSeconds}S`}>{formatWorkoutDuration(startingSeconds)}</time>
          </div>
        )}
        {props.error && <p className={styles.error} role="alert">{props.error}</p>}
        <Button disabled={props.busyAction !== null || startingAtMs !== null} onClick={startNow}>
          {props.busyAction === 'start' || startingAtMs !== null ? 'Starting…' : 'Start Lift'}
        </Button>
      </main>
    </WorkoutShell>
  );
}

export function ActiveWorkoutScreen(props: ActiveProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightDisplayUnit>(props.initialWeightUnit ?? 'KG');
  const [pauseIntentAtMs, setPauseIntentAtMs] = useState<number | null>(null);
  const [resumeIntentAtMs, setResumeIntentAtMs] = useState<number | null>(null);
  const seconds = useWorkoutClock(props.workout, pauseIntentAtMs, resumeIntentAtMs);
  const persistedPaused = props.workout.pausedAt !== null;
  const displayPaused = persistedPaused && resumeIntentAtMs === null;
  const lifecycleBusy = props.busyAction !== null;
  const compositionBusy = props.compositionBusyAction !== null;
  const recoveryState = props.recoveryState ?? 'synced';
  const serverMutationsEnabled = recoveryState === 'synced';

  useEffect(() => {
    if (pauseIntentAtMs !== null && props.busyAction !== 'pause' && (props.workout.pausedAt !== null || props.error)) {
      setPauseIntentAtMs(null);
    }
  }, [pauseIntentAtMs, props.busyAction, props.error, props.workout.pausedAt]);

  useEffect(() => {
    if (resumeIntentAtMs !== null && props.busyAction !== 'resume' && (props.workout.pausedAt === null || props.error)) {
      setResumeIntentAtMs(null);
    }
  }, [resumeIntentAtMs, props.busyAction, props.error, props.workout.pausedAt]);

  useEffect(() => {
    setWeightUnit(props.initialWeightUnit ?? 'KG');
  }, [props.initialWeightUnit, props.workout.id]);

  useEffect(() => {
    if (!serverMutationsEnabled) setPickerOpen(false);
  }, [serverMutationsEnabled]);

  const changeWeightUnit = (unit: WeightDisplayUnit) => {
    setWeightUnit(unit);
    props.onWeightUnitChange?.(unit);
  };

  const pauseNow = () => {
    const actionAtMs = Date.now();
    setPauseIntentAtMs(actionAtMs);
    void props.onPause(actionAtMs);
  };

  const resumeNow = () => {
    const actionAtMs = Date.now();
    setResumeIntentAtMs(actionAtMs);
    void props.onResume(actionAtMs);
  };

  return (
    <WorkoutShell {...props}>
      <main className={styles.active}>
        {recoveryState !== 'synced' && (
          <section className={styles.recoveryNotice} aria-live="polite" role="status">
            <strong>{recoveryState === 'offline' ? 'Offline workout copy' : recoveryState === 'recovering' ? 'Recovering workout' : 'Local workout copy'}</strong>
            <span>
              {recoveryState === 'offline'
                ? 'This lift stays on this device. Existing set drafts remain editable; server actions wait for a connection.'
                : recoveryState === 'recovering'
                  ? 'Your saved local lift is visible while the server copy is checked.'
                  : 'The server could not be reached. Your local lift remains visible and set drafts stay on this device.'}
            </span>
          </section>
        )}
        <header className={styles.activeHeader}>
          <div>
            <p className={styles.kicker}>ACTIVE LIFT</p>
            <h1>{displayPaused ? 'Workout paused' : 'Workout in progress'}</h1>
          </div>
          <time className={styles.timer} dateTime={`PT${seconds}S`}>{formatWorkoutDuration(seconds)}</time>
        </header>

        <section className={styles.sessionMeta} aria-label="Workout session state">
          <div><span>Started</span><strong>{new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(props.workout.startedAt))}</strong></div>
          <div><span>Scoring date</span><strong>{props.workout.scoringDate}</strong></div>
          <div><span>Timer</span><strong>{displayPaused ? 'Paused' : 'Running'}</strong></div>
        </section>

        <section className={styles.exerciseStage} aria-labelledby="workout-exercises-heading">
          <div className={styles.exerciseHeading}>
            <div>
              <p className={styles.kicker}>EXERCISES</p>
              <h2 id="workout-exercises-heading">{props.exercises.length > 0 ? `${props.exercises.length} in this lift` : 'No exercises yet'}</h2>
            </div>
            <div className={styles.exerciseHeadingActions}>
              <div aria-label="Weight unit" className={styles.unitSwitch} role="group">
                <button aria-pressed={weightUnit === 'KG'} onClick={() => changeWeightUnit('KG')} type="button">kg</button>
                <button aria-pressed={weightUnit === 'LB'} onClick={() => changeWeightUnit('LB')} type="button">lb</button>
              </div>
              {props.exercises.length > 0 && <span className={styles.exerciseCount}>{props.exercises.length}</span>}
              <button className={styles.addExerciseButton} disabled={!serverMutationsEnabled} onClick={() => setPickerOpen(true)} type="button">Add exercise</button>
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
                      disabled={!serverMutationsEnabled || compositionBusy || index === 0}
                      onClick={() => void props.onMoveExercise(exercise.id, index - 1)}
                      type="button"
                    >↑</button>
                    <button
                      aria-label={`Move ${exercise.canonicalName} down`}
                      disabled={!serverMutationsEnabled || compositionBusy || index === props.exercises.length - 1}
                      onClick={() => void props.onMoveExercise(exercise.id, index + 1)}
                      type="button"
                    >↓</button>
                    <button
                      aria-label={`Remove ${exercise.canonicalName}`}
                      className={styles.removeExercise}
                      disabled={!serverMutationsEnabled || compositionBusy}
                      onClick={() => void props.onRemoveExercise(exercise.id)}
                      type="button"
                    >Remove</button>
                  </div>
                  <WorkoutSetList
                    busy={props.setBusy}
                    exercise={exercise}
                    onAddSet={props.onAddSet}
                    onCopySet={props.onCopySet}
                    onDraftChange={props.onSetDraftChange}
                    onDraftPersisted={props.onSetDraftPersisted}
                    onRemoveSet={props.onRemoveSet}
                    onSaveSet={props.onSaveSet}
                    recoveryDrafts={props.recoveryDrafts}
                    serverMutationsEnabled={serverMutationsEnabled}
                    sets={props.workoutSets.filter((set) => set.workoutExerciseId === exercise.id)}
                    status={props.setStatus}
                    unit={weightUnit}
                  />
                </li>
              ))}
            </ol>
          )}

          {props.compositionError && props.exerciseStatus !== 'error' && <p className={styles.error} role="alert">{props.compositionError}</p>}
          {props.setStatus === 'error' && (
            <div className={styles.exerciseError}>
              <p role="alert">{props.setError || 'Unable to load workout sets.'}</p>
              <button type="button" onClick={() => void props.onRetrySets()}>Retry sets</button>
            </div>
          )}
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

        <div className={styles.lifecycleActions}>
          {persistedPaused ? (
            <Button disabled={!serverMutationsEnabled || lifecycleBusy} onClick={resumeNow}>{props.busyAction === 'resume' ? 'Resuming…' : 'Resume timer'}</Button>
          ) : (
            <Button disabled={!serverMutationsEnabled || lifecycleBusy} onClick={pauseNow}>{props.busyAction === 'pause' ? 'Pausing…' : 'Pause timer'}</Button>
          )}
          <Button disabled={!serverMutationsEnabled || lifecycleBusy} onClick={() => void props.onFinish()}>{props.busyAction === 'finish' ? 'Finishing…' : 'Finish workout'}</Button>
        </div>

        <button className={styles.cancelButton} disabled={!serverMutationsEnabled || lifecycleBusy} onClick={() => void props.onCancel()} type="button">
          {props.busyAction === 'cancel' ? 'Cancelling…' : 'Cancel workout'}
        </button>
      </main>
    </WorkoutShell>
  );
}
