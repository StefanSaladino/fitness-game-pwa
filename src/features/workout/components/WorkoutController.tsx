import { useEffect, useRef } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { ExercisePickerService } from '../exercisePickerService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutSetService } from '../workoutSetService';
import { toUserFacingWorkoutError } from '../workoutMessages';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useWorkoutExercises } from '../hooks/useWorkoutExercises';
import { useWorkoutSets } from '../hooks/useWorkoutSets';
import { useExercisePickerCatalog } from '../hooks/useExercisePickerCatalog';
import { useWorkoutRecovery } from '../hooks/useWorkoutRecovery';
import { useWorkoutMutationQueue } from '../hooks/useWorkoutMutationQueue';
import {
  restoreWorkoutExercises,
  restoreWorkoutSession,
  restoreWorkoutSets,
  type WorkoutRecoveryState,
} from '../recovery/workoutRecoveryModel';
import { ActiveWorkoutScreen, WorkoutStartScreen, WorkoutSyncConflictScreen } from './WorkoutSessionScreen';
import styles from './WorkoutSessionScreen.module.css';

interface WorkoutControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: WorkoutService;
  exerciseService?: WorkoutExerciseService;
  pickerService?: ExercisePickerService;
  setService?: WorkoutSetService;
  mutationService?: WorkoutMutationService;
}

export function WorkoutController({ profile, onNavigate, onSignOut, service, exerciseService, pickerService, setService, mutationService }: WorkoutControllerProps) {
  const recovery = useWorkoutRecovery(profile.id);
  const workout = useActiveWorkout(profile.id, service);
  const recoveredWorkout = recovery.snapshot ? restoreWorkoutSession(recovery.snapshot.session) : null;
  const useRecoveredWorkout = workout.status !== 'ready' && workout.activeWorkout === null && recoveredWorkout !== null;
  const activeWorkout = workout.activeWorkout ?? (useRecoveredWorkout ? recoveredWorkout : null);
  const recoveryMatchesWorkout = Boolean(activeWorkout && recovery.snapshot?.session.id === activeWorkout.id);
  const recoveredExercises = recoveryMatchesWorkout && recovery.snapshot ? restoreWorkoutExercises(recovery.snapshot) : [];
  const mutationQueue = useWorkoutMutationQueue(profile.id, activeWorkout?.id ?? null, mutationService);

  const composition = useWorkoutExercises(activeWorkout?.id ?? null, exerciseService, mutationQueue.executor);
  const useRecoveredExercises = recoveryMatchesWorkout && composition.status !== 'ready';
  const exercises = useRecoveredExercises ? recoveredExercises : composition.exercises;

  const picker = useExercisePickerCatalog(Boolean(activeWorkout), pickerService);
  const recoveredSets = recoveryMatchesWorkout && recovery.snapshot
    ? restoreWorkoutSets(recovery.snapshot).filter((set) => exercises.some((exercise) => exercise.id === set.workoutExerciseId))
    : [];
  const sets = useWorkoutSets(
    exercises.map((exercise) => exercise.id),
    setService,
    mutationQueue.executor,
    recoveredSets,
    recovery.setSetRevision,
  );
  const useRecoveredSets = recoveryMatchesWorkout && sets.status !== 'ready';
  const workoutSets = useRecoveredSets ? recoveredSets : sets.sets;

  useEffect(() => {
    if (workout.status === 'ready' && workout.activeWorkout === null && mutationQueue.pendingCount === 0) recovery.clear();
  }, [mutationQueue.pendingCount, recovery.clear, workout.activeWorkout, workout.status]);

  useEffect(() => {
    if (!workout.activeWorkout || composition.status !== 'ready' || sets.status !== 'ready') return;
    recovery.captureCanonical(workout.activeWorkout, composition.exercises, sets.sets);
  }, [composition.exercises, composition.status, recovery.captureCanonical, sets.sets, sets.status, workout.activeWorkout]);

  const handledReconnect = useRef(0);
  useEffect(() => {
    if (recovery.reconnectCount === 0 || recovery.reconnectCount <= handledReconnect.current) return;
    handledReconnect.current = recovery.reconnectCount;
    void mutationQueue.replay();
    void workout.retry();
    if (activeWorkout) {
      void composition.retry();
      void sets.retry();
      void picker.retry();
    }
  }, [activeWorkout, composition.retry, mutationQueue.replay, picker.retry, recovery.reconnectCount, sets.retry, workout.retry]);

  const handledMutationRevision = useRef(0);
  useEffect(() => {
    if (mutationQueue.appliedRevision === 0 || mutationQueue.appliedRevision <= handledMutationRevision.current) return;
    handledMutationRevision.current = mutationQueue.appliedRevision;
    if (!activeWorkout) return;
    void composition.retry();
    void sets.retry();
  }, [activeWorkout, composition.retry, mutationQueue.appliedRevision, sets.retry]);

  const usingAnyRecovery = useRecoveredWorkout || useRecoveredExercises || useRecoveredSets;
  const hasRemoteReadError = workout.status === 'error' || composition.status === 'error' || sets.status === 'error';
  let recoveryState: WorkoutRecoveryState = 'synced';
  if (recovery.connectionState === 'offline') recoveryState = 'offline';
  else if (usingAnyRecovery) recoveryState = hasRemoteReadError ? 'local-only' : 'recovering';

  if (workout.status === 'loading' && !useRecoveredWorkout) {
    return (
      <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
        <div className={styles.start} role="status">Recovering active workout…</div>
      </AppShell>
    );
  }

  if (workout.status === 'error' && !useRecoveredWorkout) {
    return (
      <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
        <section className={styles.start}>
          <p className={styles.error}>{workout.error}</p>
          <Button onClick={() => void workout.retry()}>Try again</Button>
        </section>
      </AppShell>
    );
  }

  if (!activeWorkout) {
    if (recoveredWorkout && mutationQueue.pendingCount > 0) {
      return (
        <WorkoutSyncConflictScreen
          message="The server no longer has this workout as active, so the saved local changes cannot be replayed safely. Using the server version discards those queued local changes."
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onUseServerVersion={async () => {
            await mutationQueue.discardWorkout(recoveredWorkout.id);
            recovery.clear();
            onNavigate('home');
          }}
          profile={profile}
          resolving={mutationQueue.status === 'replaying'}
        />
      );
    }
    return <WorkoutStartScreen busyAction={workout.busyAction} error={workout.error} onNavigate={onNavigate} onSignOut={onSignOut} onStart={workout.start} profile={profile} />;
  }

  const recoveryDrafts = recoveryMatchesWorkout ? recovery.snapshot?.ui.setDrafts : undefined;
  const initialWeightUnit = recoveryMatchesWorkout ? recovery.snapshot?.ui.weightUnit : undefined;

  return (
    <ActiveWorkoutScreen
      busyAction={workout.busyAction}
      compositionBusyAction={composition.busyAction}
      compositionError={useRecoveredExercises ? '' : composition.error}
      exerciseCatalog={picker.catalog}
      exercisePickerError={picker.error}
      exercisePickerStatus={picker.status}
      exerciseStatus={useRecoveredExercises ? 'ready' : composition.status}
      exercises={exercises}
      error={useRecoveredWorkout ? '' : workout.error}
      initialWeightUnit={initialWeightUnit}
      mutationQueueError={mutationQueue.status === 'blocked' || mutationQueue.status === 'conflict' ? toUserFacingWorkoutError(new Error(mutationQueue.error)) : ''}
      mutationQueuePendingCount={mutationQueue.pendingCount}
      mutationQueueStatus={mutationQueue.status}
      onRetryMutationQueue={mutationQueue.retryBlocked}
      onDiscardMutationConflict={async () => {
        const discardedWorkoutId = await mutationQueue.discardConflictingWorkout();
        if (!discardedWorkoutId) return;
        recovery.clearDrafts();
        await Promise.all([workout.retry(), composition.retry(), sets.retry()]);
      }}
      onCancel={async () => {
        const id = await workout.cancel();
        if (id) {
          recovery.clear();
          onNavigate('home');
        }
        return id;
      }}
      onFinish={async () => {
        const id = await workout.finish();
        if (id) {
          recovery.clear();
          onNavigate('home');
        }
        return id;
      }}
      onAddExercise={composition.addExercise}
      onMoveExercise={composition.moveExercise}
      onNavigate={onNavigate}
      onPause={workout.pause}
      onRemoveExercise={composition.removeExercise}
      onResume={workout.resume}
      onRetryExercisePicker={picker.retry}
      onRetryExercises={composition.retry}
      onSetDraftChange={recovery.setDraft}
      onSetDraftPersisted={recovery.clearDraft}
      onWeightUnitChange={recovery.setWeightUnit}
      recoveryDrafts={recoveryDrafts}
      recoveryState={recoveryState}
      workoutSets={workoutSets}
      setStatus={useRecoveredSets ? 'ready' : sets.status}
      setBusy={sets.busy}
      setError={useRecoveredSets ? '' : sets.error}
      onRetrySets={sets.retry}
      onAddSet={sets.addSet}
      onCopySet={sets.copySet}
      onSaveSet={sets.saveSet}
      onRemoveSet={sets.removeSet}
      onSignOut={onSignOut}
      profile={profile}
      workout={activeWorkout}
    />
  );
}
