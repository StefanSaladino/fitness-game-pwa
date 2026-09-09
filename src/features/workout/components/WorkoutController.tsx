import { useEffect, useRef, useState } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseAnalyticsTrackingService } from '../../progress/analyticsTrackingService';
import { useExerciseAnalyticsTracking } from '../../progress/hooks/useExerciseAnalyticsTracking';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { ExercisePickerService } from '../exercisePickerService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutHistoryService } from '../workoutHistoryService';
import type { WorkoutSetService } from '../workoutSetService';
import { toUserFacingWorkoutError } from '../workoutMessages';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useWorkoutExercises } from '../hooks/useWorkoutExercises';
import { useWorkoutSets } from '../hooks/useWorkoutSets';
import { useExercisePickerCatalog } from '../hooks/useExercisePickerCatalog';
import { useWorkoutRecovery } from '../hooks/useWorkoutRecovery';
import { useWorkoutMutationQueue } from '../hooks/useWorkoutMutationQueue';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { presetWorkoutById, resolvePresetWorkout, type PresetWorkoutId } from '../presetWorkouts';
import {
  restoreWorkoutExercises,
  restoreWorkoutSession,
  restoreWorkoutSets,
  type WorkoutRecoveryState,
} from '../recovery/workoutRecoveryModel';
import { ActiveWorkoutScreen, WorkoutSyncConflictScreen } from './WorkoutSessionScreen';
import { WorkoutPresetStartScreen, type WorkoutPresetStartScreenProps } from './WorkoutPresetStartScreen';
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
  historyService?: WorkoutHistoryService;
  analyticsTrackingService?: ExerciseAnalyticsTrackingService;
}

const EMPTY_WORKOUT_HISTORY_SERVICE: WorkoutHistoryService = {
  load: async () => [],
};

const EMPTY_ANALYTICS_TRACKING_SERVICE: ExerciseAnalyticsTrackingService = {
  listTrackedExerciseIds: async () => [],
  setTracked: async (_exerciseId, tracked) => tracked,
};

function WorkoutStartWithHistory({
  historyService,
  ...props
}: WorkoutPresetStartScreenProps & { historyService?: WorkoutHistoryService }) {
  const history = useWorkoutHistory(props.profile.id, historyService);

  return (
    <WorkoutPresetStartScreen
      {...props}
      history={history.history}
      historyError={history.error}
      historyStatus={history.status}
      onRetryHistory={history.retry}
    />
  );
}

export function WorkoutController({ profile, onNavigate, onSignOut, service, exerciseService, pickerService, setService, mutationService, historyService, analyticsTrackingService }: WorkoutControllerProps) {
  const recovery = useWorkoutRecovery(profile.id);
  const workout = useActiveWorkout(profile.id, service);
  const analyticsTracking = useExerciseAnalyticsTracking(
    analyticsTrackingService ?? (service ? EMPTY_ANALYTICS_TRACKING_SERVICE : undefined),
  );
  const [presetError, setPresetError] = useState('');
  const recoveredWorkout = recovery.snapshot ? restoreWorkoutSession(recovery.snapshot.session) : null;
  const useRecoveredWorkout = workout.status !== 'ready' && workout.activeWorkout === null && recoveredWorkout !== null;
  const activeWorkout = workout.activeWorkout ?? (useRecoveredWorkout ? recoveredWorkout : null);
  const recoveryMatchesWorkout = Boolean(activeWorkout && recovery.snapshot?.session.id === activeWorkout.id);
  const recoveredExercises = recoveryMatchesWorkout && recovery.snapshot ? restoreWorkoutExercises(recovery.snapshot) : [];
  const mutationQueue = useWorkoutMutationQueue(profile.id, activeWorkout?.id ?? null, mutationService);

  const composition = useWorkoutExercises(activeWorkout?.id ?? null, exerciseService, mutationQueue.executor);
  const useRecoveredExercises = recoveryMatchesWorkout && composition.status !== 'ready';
  const exercises = useRecoveredExercises ? recoveredExercises : composition.exercises;

  const picker = useExercisePickerCatalog(true, pickerService);
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
    if (!recovery.hydrated || !mutationQueue.hydrated) return;
    if (workout.status === 'ready' && workout.activeWorkout === null && mutationQueue.pendingCount === 0) void recovery.clear();
  }, [mutationQueue.hydrated, mutationQueue.pendingCount, recovery.clear, recovery.hydrated, workout.activeWorkout, workout.status]);

  useEffect(() => {
    if (!recovery.hydrated || !workout.activeWorkout || composition.status !== 'ready' || sets.status !== 'ready') return;
    recovery.captureCanonical(workout.activeWorkout, composition.exercises, sets.sets);
  }, [composition.exercises, composition.status, recovery.captureCanonical, recovery.hydrated, sets.sets, sets.status, workout.activeWorkout]);

  const handledReconnect = useRef(0);
  useEffect(() => {
    if (recovery.reconnectCount === 0 || recovery.reconnectCount <= handledReconnect.current) return;
    handledReconnect.current = recovery.reconnectCount;
    void (async () => {
      await mutationQueue.replay();
      const serverWorkout = await workout.retry();
      if (!serverWorkout) return;
      await Promise.all([composition.retry(), sets.retry(), picker.retry()]);
    })();
  }, [composition.retry, mutationQueue.replay, picker.retry, recovery.reconnectCount, sets.retry, workout.retry]);

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

  if (!recovery.hydrated || !mutationQueue.hydrated) {
    return (
      <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
        <div className={styles.start} role="status">Recovering saved workout…</div>
      </AppShell>
    );
  }

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
            await recovery.clear();
            onNavigate('home');
          }}
          profile={profile}
          resolving={mutationQueue.status === 'replaying'}
        />
      );
    }

    const startPreset = async (presetId: PresetWorkoutId, actionAtMs?: number) => {
      setPresetError('');
      try {
        const resolvedPreset = resolvePresetWorkout(presetWorkoutById(presetId), picker.catalog);
        return await workout.startPreset(
          resolvedPreset.exerciseIds,
          actionAtMs,
          resolvedPreset.supersetGroups,
        );
      } catch (caught) {
        setPresetError(toUserFacingWorkoutError(caught));
        return null;
      }
    };

    return (
      <WorkoutStartWithHistory
        busyAction={workout.busyAction}
        error={presetError || workout.error}
        exerciseCatalog={picker.catalog}
        exercisePickerError={picker.error}
        exercisePickerStatus={picker.status}
        onNavigate={onNavigate}
        onRetryExercisePicker={picker.retry}
        onSignOut={onSignOut}
        onStart={workout.start}
        onStartPreset={startPreset}
        profile={profile}
        historyService={historyService ?? (service ? EMPTY_WORKOUT_HISTORY_SERVICE : undefined)}
      />
    );
  }

  const recoveryDrafts = recoveryMatchesWorkout ? recovery.snapshot?.ui.setDrafts : undefined;
  const initialWeightUnit = recoveryMatchesWorkout
    ? recovery.snapshot?.ui.weightUnit ?? profile.preferredWeightUnit
    : profile.preferredWeightUnit;

  return (
    <ActiveWorkoutScreen
      analyticsTrackingBusyExerciseId={analyticsTracking.busyExerciseId}
      analyticsTrackingError={analyticsTracking.error}
      analyticsTrackingStatus={analyticsTracking.status}
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
          await recovery.clear();
          onNavigate('home');
        }
        return id;
      }}
      onFinish={async () => {
        const id = await workout.finish();
        if (id) {
          await recovery.clear();
          onNavigate('home');
        }
        return id;
      }}
      onAddExercise={composition.addExercise}
      onMoveExercise={composition.moveExercise}
      onSaveSuperset={composition.saveSuperset}
      onClearSuperset={composition.clearSuperset}
      onNavigate={onNavigate}
      onPause={workout.pause}
      onRemoveExercise={composition.removeExercise}
      onResume={workout.resume}
      onRetryExercisePicker={picker.retry}
      onRetryExercises={composition.retry}
      onSetDraftChange={recovery.setDraft}
      onSetDraftPersisted={recovery.clearDraft}
      onSetExerciseAnalyticsTracked={analyticsTracking.setTracked}
      onWeightUnitChange={recovery.setWeightUnit}
      recoveryDrafts={recoveryDrafts}
      recoveryState={recoveryState}
      workoutSets={workoutSets}
      setStatus={useRecoveredSets ? 'ready' : sets.status}
      setBusy={sets.busy}
      setError={useRecoveredSets ? '' : sets.error}
      onRetrySets={sets.retry}
      onAddSet={sets.addSet}
      onAddAdvancedSet={sets.addAdvancedSet}
      onSaveAdvancedSet={sets.saveAdvancedSet}
      onCopySet={sets.copySet}
      onSaveSet={sets.saveSet}
      onRemoveSet={sets.removeSet}
      onSignOut={onSignOut}
      profile={profile}
      trackedExerciseIds={analyticsTracking.trackedExerciseIds}
      workout={activeWorkout}
    />
  );
}
