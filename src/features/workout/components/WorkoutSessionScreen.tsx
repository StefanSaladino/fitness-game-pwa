import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type {
  ActiveWorkoutSession,
  ExercisePickerItem,
  WeightDisplayUnit,
  WorkoutCompositionAction,
  WorkoutExercise,
  WorkoutLifecycleAction,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutSetType,
} from '../model';
import type { WorkoutRecoverySetDraft, WorkoutRecoveryState } from '../recovery/workoutRecoveryModel';
import type { WorkoutExerciseStatus } from '../hooks/useWorkoutExercises';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
import type { WorkoutSetBusyState, WorkoutSetStatus } from '../hooks/useWorkoutSets';
import { deriveSupersetFlow } from '../supersetFlow';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from '../workoutTime';
import { ExerciseMiniIcon } from './ExerciseMiniIcon';
import { ExercisePicker } from './ExercisePicker';
import { SupersetBuilder } from './SupersetBuilder';
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
  onSaveSuperset: (supersetGroupId: string | null, workoutExerciseIds: string[]) => Promise<boolean>;
  onClearSuperset: (supersetGroupId: string) => Promise<boolean>;
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
  mutationQueuePendingCount?: number;
  mutationQueueStatus?: 'idle' | 'replaying' | 'blocked' | 'conflict';
  mutationQueueError?: string;
  onRetryMutationQueue?: () => Promise<void>;
  onDiscardMutationConflict?: () => Promise<void>;
}

interface SyncConflictProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  message: string;
  resolving: boolean;
  onUseServerVersion?: () => Promise<void>;
}

type SyncTone = 'success' | 'neutral' | 'warning' | 'danger';

interface SyncPresentation {
  title: string;
  detail: string;
  tone: SyncTone;
}

function WorkoutShell({ profile, onNavigate, onSignOut, children }: Pick<SharedProps, 'profile' | 'onNavigate' | 'onSignOut'> & { children: ReactNode }) {
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


function supersetGroupLabel(exercises: WorkoutExercise[], groupId: string): string {
  const groupIds = [...new Set(
    exercises
      .filter((item) => item.supersetGroupId !== null)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => item.supersetGroupId as string),
  )];
  const groupIndex = groupIds.indexOf(groupId);
  return groupIndex >= 0 && groupIndex < 26 ? String.fromCharCode(65 + groupIndex) : String(groupIndex + 1);
}

function supersetMarker(exercises: WorkoutExercise[], exercise: WorkoutExercise): string | null {
  if (!exercise.supersetGroupId || exercise.supersetOrder === null) return null;
  return `Superset ${supersetGroupLabel(exercises, exercise.supersetGroupId)}${exercise.supersetOrder + 1}`;
}

function TimerControlIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg aria-hidden="true" className={styles.timerControlIcon} viewBox="0 0 24 24">
      <path d="M8 5.5v13l10-6.5z" />
    </svg>
  ) : (
    <svg aria-hidden="true" className={styles.timerControlIcon} viewBox="0 0 24 24">
      <path d="M7.5 5.5h3.5v13H7.5zM13 5.5h3.5v13H13z" />
    </svg>
  );
}

function syncPresentation(
  recoveryState: WorkoutRecoveryState,
  mutationQueueStatus: NonNullable<ActiveProps['mutationQueueStatus']>,
  mutationQueuePendingCount: number,
): SyncPresentation {
  if (mutationQueueStatus === 'conflict') {
    return {
      title: 'Workout changed elsewhere',
      detail: 'A queued change used older server data. Use the server version before continuing.',
      tone: 'danger',
    };
  }
  if (mutationQueueStatus === 'blocked') {
    return {
      title: 'Workout sync needs attention',
      detail: 'A queued change could not sync automatically. Later changes are paused to preserve order.',
      tone: 'warning',
    };
  }
  if (recoveryState === 'offline') {
    return {
      title: 'Offline workout copy',
      detail: mutationQueuePendingCount > 0
        ? 'Changes are saved on this device and will replay in order after reconnecting.'
        : 'Existing set drafts stay on this device. Structural and lifecycle actions wait for a connection.',
      tone: mutationQueuePendingCount > 0 ? 'warning' : 'neutral',
    };
  }
  if (mutationQueuePendingCount > 0) {
    return {
      title: mutationQueueStatus === 'replaying'
        ? 'Syncing workout changes'
        : `${mutationQueuePendingCount} workout change${mutationQueuePendingCount === 1 ? '' : 's'} queued`,
      detail: 'The app will retry these changes in order without duplicating persisted workout data.',
      tone: 'warning',
    };
  }
  if (recoveryState === 'recovering') {
    return {
      title: 'Recovering workout',
      detail: 'Your saved local lift is visible while the server copy is checked.',
      tone: 'warning',
    };
  }
  if (recoveryState === 'local-only') {
    return {
      title: 'Local workout copy',
      detail: 'The server could not be reached. Your saved workout remains visible on this device.',
      tone: 'neutral',
    };
  }
  return {
    title: 'Synced',
    detail: 'No saved workout changes are waiting to sync.',
    tone: 'success',
  };
}

export function WorkoutSyncConflictScreen(props: SyncConflictProps) {
  return (
    <WorkoutShell {...props}>
      <div className={styles.statePage}>
        <section className={styles.recoveryPanel} data-app-surface="primary">
          <p className={styles.kicker}>WORKOUT RECOVERY</p>
          <h1>Workout changed elsewhere</h1>
          <p>{props.message}</p>
          {props.onUseServerVersion && (
            <Button disabled={props.resolving} onClick={() => void props.onUseServerVersion?.()}>
              {props.resolving ? 'Checking server…' : 'Use server version'}
            </Button>
          )}
        </section>
      </div>
    </WorkoutShell>
  );
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
      <div className={styles.statePage}>
        <section className={styles.startPanel} data-app-surface="primary">
          <div className={styles.startCopy}>
            <p className={styles.kicker}>WORKOUT</p>
            <h1>Start a lift</h1>
            <p>Start the session now. If a workout is already active on your account, this resumes it instead of creating a duplicate.</p>
          </div>
          {startingAtMs !== null && (
            <div className={styles.startingClock} role="status">
              <span>Starting workout</span>
              <time dateTime={`PT${startingSeconds}S`}>{formatWorkoutDuration(startingSeconds)}</time>
            </div>
          )}
          {props.error && <p className={styles.error} role="alert">{props.error}</p>}
          <div className={styles.startActions}>
            <Button disabled={props.busyAction !== null || startingAtMs !== null} fullWidth onClick={startNow}>
              {props.busyAction === 'start' || startingAtMs !== null ? 'Starting…' : 'Start Lift'}
            </Button>
            <Button variant="secondary" disabled={props.busyAction !== null || startingAtMs !== null} fullWidth onClick={() => props.onNavigate('cardio')}>Log cardio instead</Button>
          </div>
        </section>
      </div>
    </WorkoutShell>
  );
}

export function ActiveWorkoutScreen(props: ActiveProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightDisplayUnit>(props.initialWeightUnit ?? 'KG');
  const [pauseIntentAtMs, setPauseIntentAtMs] = useState<number | null>(null);
  const [resumeIntentAtMs, setResumeIntentAtMs] = useState<number | null>(null);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(() => props.exercises[0]?.id ?? null);
  const hasInitializedExerciseExpansionRef = useRef(props.exercises.length > 0);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<'finish' | 'cancel' | null>(null);
  const [supersetAnchorId, setSupersetAnchorId] = useState<string | null>(null);
  const workoutContentRef = useRef<HTMLDivElement | null>(null);
  const lifecycleDialogRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const safeLifecycleButtonRef = useRef<HTMLButtonElement | null>(null);
  const lifecycleBusyRef = useRef(false);
  const seconds = useWorkoutClock(props.workout, pauseIntentAtMs, resumeIntentAtMs);
  const persistedPaused = props.workout.pausedAt !== null;
  const displayPaused = persistedPaused && resumeIntentAtMs === null;
  const lifecycleBusy = props.busyAction !== null;
  const compositionBusy = props.compositionBusyAction !== null;
  const recoveryState = props.recoveryState ?? 'synced';
  const mutationQueuePendingCount = props.mutationQueuePendingCount ?? 0;
  const mutationQueueStatus = props.mutationQueueStatus ?? 'idle';
  const queueBlocked = mutationQueueStatus === 'blocked';
  const queueConflict = mutationQueueStatus === 'conflict';
  const serverMutationsEnabled = recoveryState === 'synced' && !queueBlocked && !queueConflict && mutationQueuePendingCount === 0;
  const setEditsEnabled = recoveryState !== 'recovering' && !queueBlocked && !queueConflict;
  const lifecycleMutationsEnabled = serverMutationsEnabled;
  const syncState = syncPresentation(recoveryState, mutationQueueStatus, mutationQueuePendingCount);
  lifecycleBusyRef.current = props.busyAction === 'finish' || props.busyAction === 'cancel';

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
    if (!serverMutationsEnabled) {
      setPickerOpen(false);
      setSupersetAnchorId(null);
    }
  }, [serverMutationsEnabled]);

  useEffect(() => {
    if (!hasInitializedExerciseExpansionRef.current && props.exercises.length > 0) {
      hasInitializedExerciseExpansionRef.current = true;
      setExpandedExerciseId(props.exercises[0]?.id ?? null);
      return;
    }
    if (expandedExerciseId === null) return;
    if (props.exercises.some((exercise) => exercise.id === expandedExerciseId)) return;
    setExpandedExerciseId(null);
  }, [expandedExerciseId, props.exercises]);

  useEffect(() => {
    if (!lifecycleConfirm) return undefined;

    const content = workoutContentRef.current;
    const dialog = lifecycleDialogRef.current;
    content?.setAttribute('inert', '');
    safeLifecycleButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !lifecycleBusyRef.current) {
        event.preventDefault();
        setLifecycleConfirm(null);
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled)')) as HTMLButtonElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      content?.removeAttribute('inert');
      window.requestAnimationFrame(() => {
        if (lifecycleConfirm === 'finish') document.querySelector<HTMLButtonElement>('[data-finish-workout]')?.focus();
        else cancelButtonRef.current?.focus();
      });
    };
  }, [lifecycleConfirm]);

  useEffect(() => {
    if (!lifecycleMutationsEnabled) setLifecycleConfirm(null);
  }, [lifecycleMutationsEnabled]);

  useEffect(() => {
    if (!pickerOpen && !supersetAnchorId) return undefined;
    const content = workoutContentRef.current;
    content?.setAttribute('inert', '');
    return () => content?.removeAttribute('inert');
  }, [pickerOpen, supersetAnchorId]);

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

  const confirmLifecycle = async () => {
    if (lifecycleConfirm === 'finish') await props.onFinish();
    if (lifecycleConfirm === 'cancel') await props.onCancel();
    setLifecycleConfirm(null);
  };

  const goToSupersetExercise = (exerciseId: string) => {
    setExpandedExerciseId(exerciseId);
    window.requestAnimationFrame(() => {
      document.getElementById(`workout-exercise-row-${exerciseId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  };

  const dialogIsFinish = lifecycleConfirm === 'finish';

  return (
    <WorkoutShell {...props}>
      <div className={styles.active}>
        <div ref={workoutContentRef} className={styles.workoutContent} aria-hidden={(Boolean(lifecycleConfirm) || pickerOpen || Boolean(supersetAnchorId)) || undefined}>
          <section className={styles.sessionOverview} data-app-surface="primary">
            <header className={styles.activeHeader}>
              <div className={styles.activeTitle}>
                <p className={styles.kicker}>ACTIVE LIFT</p>
                <h1>{displayPaused ? 'Workout paused' : 'Workout in progress'}</h1>
              </div>
            </header>

            <div className={styles.sessionMeta} aria-label="Workout session state">
              <div><span>Started</span><strong>{new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(props.workout.startedAt))}</strong></div>
              <div><span>Scoring date</span><strong>{props.workout.scoringDate}</strong></div>
            </div>

            {syncState.tone === 'success' && (
              <div className={styles.syncQuiet} aria-live="polite" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Synced</strong>
              </div>
            )}
          </section>

          {syncState.tone !== 'success' && (
            <section className={`${styles.syncNotice} ${styles[`sync${syncState.tone[0].toUpperCase()}${syncState.tone.slice(1)}`]}`} aria-live="polite" role="status">
              <div>
                <strong>{syncState.title}</strong>
                {recoveryState === 'offline' && mutationQueuePendingCount > 0 && (
                  <span>{mutationQueuePendingCount} workout change{mutationQueuePendingCount === 1 ? '' : 's'} queued</span>
                )}
                <span>{syncState.detail}</span>
              </div>
              {queueConflict && props.onDiscardMutationConflict && (
                <button onClick={() => void props.onDiscardMutationConflict?.()} type="button">Use server version</button>
              )}
              {!queueConflict && mutationQueuePendingCount > 0 && mutationQueueStatus !== 'replaying' && recoveryState !== 'offline' && props.onRetryMutationQueue && (
                <button onClick={() => void props.onRetryMutationQueue?.()} type="button">Retry sync</button>
              )}
              {(queueBlocked || queueConflict) && props.mutationQueueError && <span className={styles.queueError}>{props.mutationQueueError}</span>}
            </section>
          )}

          <div className={styles.stickyTimerBar} aria-label="Active workout timer">
            <div className={styles.stickyTimerState}>
              <span>{displayPaused ? 'Paused' : 'Active lift'}</span>
              <time className={styles.stickyTimer} dateTime={`PT${seconds}S`}>{formatWorkoutDuration(seconds)}</time>
            </div>
            <button
              aria-label={persistedPaused ? 'Resume timer' : 'Pause timer'}
              className={styles.stickyTimerControl}
              disabled={!lifecycleMutationsEnabled || lifecycleBusy}
              onClick={persistedPaused ? resumeNow : pauseNow}
              type="button"
            >
              <TimerControlIcon paused={persistedPaused} />
            </button>
          </div>

          <section className={styles.exerciseStage} aria-labelledby="workout-exercises-heading" data-app-surface="category">
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
                {(() => {
                  const renderedSupersetIds = new Set<string>();

                  const renderExerciseRow = (exercise: WorkoutExercise, index: number, supersetCurrent = false) => {
                    const expanded = expandedExerciseId === exercise.id;
                    const panelId = `workout-exercise-${exercise.id}`;
                    return (
                      <li
                        aria-current={supersetCurrent ? 'step' : undefined}
                        className={`${styles.exerciseRow}${expanded ? ` ${styles.exerciseExpanded}` : ''}${supersetCurrent ? ` ${styles.supersetCurrentMember}` : ''}`}
                        id={`workout-exercise-row-${exercise.id}`}
                        key={exercise.id}
                      >
                        <div className={styles.exerciseTopline}>
                          <button
                            aria-controls={panelId}
                            aria-expanded={expanded}
                            className={styles.exerciseToggle}
                            onClick={() => setExpandedExerciseId((current) => current === exercise.id ? null : exercise.id)}
                            type="button"
                          >
                            <span className={styles.exerciseIconFrame}>
                              <ExerciseMiniIcon canonicalName={exercise.canonicalName} className={styles.exerciseIcon} />
                            </span>
                            <span className={styles.exerciseIdentity}>
                              <strong>{exercise.canonicalName}</strong>
                              <span>{supersetMarker(props.exercises, exercise) ?? measurementLabel(exercise)}</span>
                            </span>
                            <span className={styles.exerciseChevron} aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
                          </button>
                        </div>
                        {expanded && (
                          <>
                            <div
                              className={`${styles.exerciseActions}${exercise.supersetGroupId ? ` ${styles.groupedExerciseActions}` : ''}`}
                              aria-label={`${exercise.canonicalName} management`}
                              role="group"
                            >
                              <button
                                aria-label={`Move ${exercise.canonicalName} up`}
                                className={styles.moveExercise}
                                disabled={!serverMutationsEnabled || compositionBusy || index === 0 || exercise.supersetGroupId !== null}
                                title={exercise.supersetGroupId ? 'Manage the Superset before moving this exercise.' : undefined}
                                onClick={() => void props.onMoveExercise(exercise.id, index - 1)}
                                type="button"
                              ><span aria-hidden="true">↑</span><span className={styles.exerciseActionLabel}>Move up</span></button>
                              <button
                                aria-label={`Move ${exercise.canonicalName} down`}
                                className={styles.moveExercise}
                                disabled={!serverMutationsEnabled || compositionBusy || index === props.exercises.length - 1 || exercise.supersetGroupId !== null}
                                title={exercise.supersetGroupId ? 'Manage the Superset before moving this exercise.' : undefined}
                                onClick={() => void props.onMoveExercise(exercise.id, index + 1)}
                                type="button"
                              ><span aria-hidden="true">↓</span><span className={styles.exerciseActionLabel}>Move down</span></button>
                              {!exercise.supersetGroupId && (
                                <button
                                  aria-label={`Create Superset for ${exercise.canonicalName}`}
                                  className={styles.supersetExercise}
                                  disabled={!serverMutationsEnabled || compositionBusy || props.exercises.length < 2}
                                  onClick={() => setSupersetAnchorId(exercise.id)}
                                  type="button"
                                >Superset</button>
                              )}
                              <button
                                aria-label={`Remove ${exercise.canonicalName}`}
                                className={styles.removeExercise}
                                disabled={!serverMutationsEnabled || compositionBusy || exercise.supersetGroupId !== null}
                                title={exercise.supersetGroupId ? 'Manage or break apart the Superset before removing this exercise.' : undefined}
                                onClick={() => void props.onRemoveExercise(exercise.id)}
                                type="button"
                              >Remove</button>
                            </div>
                            <div className={styles.exerciseSets} id={panelId}>
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
                                setEditsEnabled={setEditsEnabled}
                                sets={props.workoutSets.filter((set) => set.workoutExerciseId === exercise.id)}
                                status={props.setStatus}
                                unit={weightUnit}
                              />
                            </div>
                          </>
                        )}
                      </li>
                    );
                  };

                  return props.exercises.map((exercise, index) => {
                    if (!exercise.supersetGroupId) return renderExerciseRow(exercise, index);
                    if (renderedSupersetIds.has(exercise.supersetGroupId)) return null;

                    const groupId = exercise.supersetGroupId;
                    renderedSupersetIds.add(groupId);
                    const members = props.exercises
                      .filter((item) => item.supersetGroupId === groupId)
                      .sort((left, right) => (left.supersetOrder ?? 0) - (right.supersetOrder ?? 0));
                    const groupLabel = supersetGroupLabel(props.exercises, groupId);
                    const flow = deriveSupersetFlow(members, props.workoutSets);
                    const currentMember = flow.currentExerciseId
                      ? members.find((member) => member.id === flow.currentExerciseId) ?? null
                      : null;
                    const currentPosition = flow.currentSupersetOrder === null
                      ? null
                      : `${groupLabel}${flow.currentSupersetOrder + 1}`;
                    const flowStatus = flow.complete
                      ? 'Superset complete'
                      : currentMember && flow.currentSetNumber !== null
                        ? `Next: ${currentPosition} ${currentMember.canonicalName} · Set ${flow.currentSetNumber}`
                        : currentMember
                          ? `Start with ${currentPosition} ${currentMember.canonicalName}`
                          : 'Superset ready';
                    const progressLabel = flow.totalSets > 0
                      ? `${flow.completedSets} of ${flow.totalSets} sets complete`
                      : 'No sets logged yet';
                    const progressPercent = flow.totalSets > 0
                      ? Math.round((flow.completedSets / flow.totalSets) * 100)
                      : 0;

                    return (
                      <li aria-label={`Superset ${groupLabel} group`} className={styles.supersetGroup} key={groupId}>
                        <div className={styles.supersetGroupHeader}>
                          <span className={styles.supersetGroupBadge}>Superset {groupLabel}</span>
                          <span className={styles.supersetGroupSummary}>{members.length} exercises · {groupLabel}1 → {groupLabel}{members.length}</span>
                          <button
                            aria-label={`Manage Superset ${groupLabel}`}
                            className={styles.supersetManageButton}
                            disabled={!serverMutationsEnabled || compositionBusy}
                            onClick={() => setSupersetAnchorId(members[0]?.id ?? null)}
                            type="button"
                          >Manage</button>
                        </div>
                        <div className={`${styles.supersetFlow}${flow.complete ? ` ${styles.supersetFlowComplete}` : ''}`} aria-live="polite">
                          <div className={styles.supersetFlowCopy}>
                            <span className={styles.supersetFlowEyebrow}>Active sequence</span>
                            <strong>{flowStatus}</strong>
                            <span>{progressLabel}</span>
                            <div
                              aria-label={`Superset ${groupLabel} progress`}
                              aria-valuemax={Math.max(flow.totalSets, 1)}
                              aria-valuemin={0}
                              aria-valuenow={flow.completedSets}
                              className={styles.supersetProgressTrack}
                              role="progressbar"
                            >
                              <span className={styles.supersetProgressFill} style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                          {!flow.complete && currentMember && currentPosition && (
                            <button
                              aria-label={`Go to ${currentPosition} ${currentMember.canonicalName}`}
                              className={styles.supersetGoButton}
                              onClick={() => goToSupersetExercise(currentMember.id)}
                              type="button"
                            >Go to {currentPosition}</button>
                          )}
                        </div>
                        <ol className={styles.supersetMemberList}>
                          {members.map((member) => renderExerciseRow(
                            member,
                            props.exercises.findIndex((item) => item.id === member.id),
                            member.id === flow.currentExerciseId && !flow.complete,
                          ))}
                        </ol>
                      </li>
                    );
                  });
                })()}
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

          {props.error && <p className={styles.error} role="alert">{props.error}</p>}

          <div className={styles.lifecycleActions}>
            <Button data-finish-workout disabled={!lifecycleMutationsEnabled || lifecycleBusy} onClick={() => setLifecycleConfirm('finish')}>
              {props.busyAction === 'finish' ? 'Finishing…' : 'Finish workout'}
            </Button>
            <button
              ref={cancelButtonRef}
              className={styles.cancelButton}
              disabled={!lifecycleMutationsEnabled || lifecycleBusy}
              onClick={() => setLifecycleConfirm('cancel')}
              type="button"
            >Cancel workout</button>
          </div>
        </div>

        {supersetAnchorId && (
          <SupersetBuilder
            anchorExerciseId={supersetAnchorId}
            busy={compositionBusy}
            exercises={props.exercises}
            onBreakApart={props.onClearSuperset}
            onClose={() => setSupersetAnchorId(null)}
            onSave={props.onSaveSuperset}
          />
        )}

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

        {lifecycleConfirm && (
          <div className={styles.lifecycleBackdrop}>
            <section
              ref={lifecycleDialogRef}
              aria-describedby="workout-lifecycle-description"
              aria-labelledby="workout-lifecycle-title"
              aria-modal="true"
              className={styles.lifecycleDialog}
              data-lifecycle-action={lifecycleConfirm}
              role="dialog"
            >
              <div className={styles.dialogHandle} aria-hidden="true" />
              <p className={styles.kicker}>{dialogIsFinish ? 'FINISH WORKOUT' : 'CANCEL WORKOUT'}</p>
              <h2 id="workout-lifecycle-title">{dialogIsFinish ? 'Finish this workout?' : 'Cancel this workout?'}</h2>
              <p id="workout-lifecycle-description">
                {dialogIsFinish
                  ? 'Completed sets will be finalized and this lift will move to your workout history.'
                  : 'The active workout will be cancelled. Nothing changes until you confirm.'}
              </p>
              <div className={styles.lifecycleDialogActions}>
                <button
                  ref={safeLifecycleButtonRef}
                  className={styles.keepWorkoutButton}
                  disabled={lifecycleBusyRef.current}
                  onClick={() => setLifecycleConfirm(null)}
                  type="button"
                >{dialogIsFinish ? 'Keep logging' : 'Keep workout'}</button>
                <button
                  className={dialogIsFinish ? styles.confirmFinishButton : styles.confirmCancelButton}
                  disabled={lifecycleBusyRef.current}
                  onClick={() => void confirmLifecycle()}
                  type="button"
                >
                  {dialogIsFinish
                    ? (props.busyAction === 'finish' ? 'Finishing…' : 'Finish workout')
                    : (props.busyAction === 'cancel' ? 'Cancelling…' : 'Cancel workout')}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </WorkoutShell>
  );
}
