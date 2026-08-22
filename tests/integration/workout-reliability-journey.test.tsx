import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { OnboardingProfile } from '../../src/features/onboarding';
import { WorkoutController } from '../../src/features/workout/components/WorkoutController';
import type { ExercisePickerService } from '../../src/features/workout/exercisePickerService';
import type { ActiveWorkoutSession, WorkoutExercise, WorkoutSet } from '../../src/features/workout/model';
import type { WorkoutExerciseService } from '../../src/features/workout/workoutExerciseService';
import type { WorkoutMutationQueueItem } from '../../src/features/workout/mutations/workoutMutationModel';
import { createWorkoutMutationStorage } from '../../src/features/workout/mutations/workoutMutationStorage';
import { createWorkoutRecoveryStorage } from '../../src/features/workout/recovery/workoutRecoveryStorage';
import type { WorkoutMutationService } from '../../src/features/workout/mutations/workoutMutationService';
import type { WorkoutService } from '../../src/features/workout/workoutService';
import type { WorkoutSetService } from '../../src/features/workout/workoutSetService';

const USER_ID = '61111111-1111-4111-8111-111111111111';
const WORKOUT_ID = '62222222-2222-4222-8222-222222222222';
const EXERCISE_ID = '63333333-3333-4333-8333-333333333333';
const WORKOUT_EXERCISE_ID = '64444444-4444-4444-8444-444444444444';
const SET_ID = '65555555-5555-4555-8555-555555555555';

const profile: OnboardingProfile = {
  id: USER_ID,
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-20T20:00:00Z',
  profileCode: 'FG-6111111111',
};

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: online });
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

function conflict(message: string) {
  return { code: 'P0001', message: `WORKOUT_CONFLICT: ${message}` };
}

function networkFailure() {
  return new TypeError('Failed to fetch');
}

interface ReliabilityBackend {
  workout: ActiveWorkoutSession;
  workoutStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  exercise: WorkoutExercise;
  sets: WorkoutSet[];
  workoutService: WorkoutService;
  exerciseService: WorkoutExerciseService;
  setService: WorkoutSetService;
  pickerService: ExercisePickerService;
  mutationService: WorkoutMutationService;
  mutationCalls: string[];
  addSetEffects: number;
  failAfterCommitOnce(kind: WorkoutMutationQueueItem['kind']): void;
  mutateSetElsewhere(weightKg: number, reps: number): void;
  raceLifecycle(action: 'finish' | 'cancel', terminalStatus: 'COMPLETED' | 'CANCELLED'): void;
}

function createReliabilityBackend(): ReliabilityBackend {
  const workout: ActiveWorkoutSession = {
    id: WORKOUT_ID,
    userId: USER_ID,
    status: 'IN_PROGRESS',
    startedAt: '2026-08-20T20:00:00Z',
    endedAt: null,
    activeDurationSeconds: 600,
    timezoneAtStart: 'America/Toronto',
    scoringDate: '2026-08-20',
    pausedAt: null,
    lastResumedAt: '2026-08-20T20:00:00Z',
  };
  const exercise: WorkoutExercise = {
    id: WORKOUT_EXERCISE_ID,
    workoutId: WORKOUT_ID,
    exerciseId: EXERCISE_ID,
    orderIndex: 0,
    revision: 0,
    canonicalName: 'Barbell Bench Press',
    measurementType: 'WEIGHT_REPS',
  };
  const sets: WorkoutSet[] = [{
    id: SET_ID,
    workoutExerciseId: WORKOUT_EXERCISE_ID,
    setNumber: 1,
    setType: 'WORKING',
    weightKg: 100,
    reps: 5,
    bodyweightMode: null,
    completed: true,
    completedAt: '2026-08-20T20:10:00Z',
    revision: 0,
  }];

  let workoutStatus: ReliabilityBackend['workoutStatus'] = 'IN_PROGRESS';
  let failAfterCommitKind: WorkoutMutationQueueItem['kind'] | null = null;
  let failedAfterCommit = false;
  let nextSet = 2;
  let addSetEffects = 0;
  let lifecycleRace: { action: 'finish' | 'cancel'; status: 'COMPLETED' | 'CANCELLED' } | null = null;
  const receipts = new Set<string>();
  const mutationCalls: string[] = [];

  const requireOnline = () => {
    if (window.navigator.onLine === false) throw networkFailure();
  };

  const workoutService: WorkoutService = {
    async loadActiveWorkout() {
      requireOnline();
      return workoutStatus === 'IN_PROGRESS' ? { ...workout, status: 'IN_PROGRESS' } : null;
    },
    async startOrResumeWorkout() {
      requireOnline();
      workoutStatus = 'IN_PROGRESS';
      return { ...workout, status: 'IN_PROGRESS' };
    },
    async pauseWorkout() {
      requireOnline();
      if (workoutStatus !== 'IN_PROGRESS') throw new Error('Active lifting workout not found');
      workout.pausedAt = '2026-08-20T20:20:00Z';
      return { ...workout };
    },
    async resumeWorkout() {
      requireOnline();
      if (workoutStatus !== 'IN_PROGRESS') throw new Error('Active lifting workout not found');
      workout.pausedAt = null;
      return { ...workout };
    },
    async finishWorkout() {
      requireOnline();
      if (lifecycleRace?.action === 'finish') {
        workoutStatus = lifecycleRace.status;
        lifecycleRace = null;
        throw new Error('Active lifting workout not found');
      }
      if (workoutStatus !== 'IN_PROGRESS') throw new Error('Active lifting workout not found');
      workoutStatus = 'COMPLETED';
    },
    async cancelWorkout() {
      requireOnline();
      if (lifecycleRace?.action === 'cancel') {
        workoutStatus = lifecycleRace.status;
        lifecycleRace = null;
        throw new Error('Active lifting workout not found');
      }
      if (workoutStatus !== 'IN_PROGRESS') throw new Error('Active lifting workout not found');
      workoutStatus = 'CANCELLED';
    },
  };

  const exerciseService: WorkoutExerciseService = {
    async loadWorkoutExercises() {
      requireOnline();
      return workoutStatus === 'IN_PROGRESS' ? [{ ...exercise }] : [];
    },
    async addExercise() { throw new Error('Direct exercise mutation bypassed queue'); },
    async removeExercise() { throw new Error('Direct exercise mutation bypassed queue'); },
    async moveExercise() { throw new Error('Direct exercise mutation bypassed queue'); },
  };

  const setService: WorkoutSetService = {
    async loadWorkoutSets() {
      requireOnline();
      return workoutStatus === 'IN_PROGRESS' ? sets.map((set) => ({ ...set })) : [];
    },
    async addSet() { throw new Error('Direct set mutation bypassed queue'); },
    async copySet() { throw new Error('Direct set mutation bypassed queue'); },
    async saveSet() { throw new Error('Direct set mutation bypassed queue'); },
    async removeSet() { throw new Error('Direct set mutation bypassed queue'); },
  };

  const pickerService: ExercisePickerService = {
    async loadCatalog() {
      requireOnline();
      return [{
        id: EXERCISE_ID,
        canonicalName: exercise.canonicalName,
        measurementType: exercise.measurementType,
        primaryMuscleGroup: 'CHEST',
        workoutType: 'BARBELL',
        aliases: ['bench'],
        lastUsedAt: null,
      }];
    },
  };

  const mutationService: WorkoutMutationService = {
    async apply(item) {
      requireOnline();
      mutationCalls.push(item.idempotencyKey);
      if (receipts.has(item.idempotencyKey)) return;
      if (workoutStatus !== 'IN_PROGRESS') throw conflict('Workout is no longer active on the server.');

      if (item.kind === 'SAVE_SET') {
        const target = sets.find((set) => set.id === item.payload.workoutSetId);
        if (!target) throw conflict('Set was removed on the server.');
        if (item.payload.expectedRevision !== target.revision) throw conflict('Set changed on the server.');
        target.setType = item.payload.setType as WorkoutSet['setType'];
        target.weightKg = item.payload.weightKg as number | null;
        target.reps = item.payload.reps as number | null;
        target.bodyweightMode = item.payload.bodyweightMode as WorkoutSet['bodyweightMode'];
        target.completed = Boolean(item.payload.completed);
        target.completedAt = target.completed ? (target.completedAt ?? '2026-08-20T20:15:00Z') : null;
        target.revision += 1;
      } else if (item.kind === 'ADD_SET') {
        sets.push({
          id: `set-${nextSet}`,
          workoutExerciseId: String(item.payload.workoutExerciseId),
          setNumber: nextSet,
          setType: item.payload.setType === 'WARMUP' ? 'WARMUP' : 'WORKING',
          weightKg: null,
          reps: null,
          bodyweightMode: null,
          completed: false,
          completedAt: null,
          revision: 0,
        });
        nextSet += 1;
        addSetEffects += 1;
      } else {
        throw new Error(`Reliability integration fixture does not implement ${item.kind}`);
      }

      receipts.add(item.idempotencyKey);
      if (failAfterCommitKind === item.kind && !failedAfterCommit) {
        failedAfterCommit = true;
        throw networkFailure();
      }
    },
  };

  const backend: ReliabilityBackend = {
    workout,
    get workoutStatus() { return workoutStatus; },
    set workoutStatus(value) { workoutStatus = value; },
    exercise,
    sets,
    workoutService,
    exerciseService,
    setService,
    pickerService,
    mutationService,
    mutationCalls,
    get addSetEffects() { return addSetEffects; },
    failAfterCommitOnce(kind) {
      failAfterCommitKind = kind;
      failedAfterCommit = false;
    },
    mutateSetElsewhere(weightKg, reps) {
      const target = sets[0]!;
      target.weightKg = weightKg;
      target.reps = reps;
      target.revision += 1;
    },
    raceLifecycle(action, terminalStatus) {
      lifecycleRace = { action, status: terminalStatus };
    },
  };
  return backend;
}

function renderWorkout(backend: ReliabilityBackend) {
  return render(
    <WorkoutController
      exerciseService={backend.exerciseService}
      mutationService={backend.mutationService}
      onNavigate={() => undefined}
      onSignOut={() => undefined}
      pickerService={backend.pickerService}
      profile={profile}
      service={backend.workoutService}
      setService={backend.setService}
    />,
  );
}

async function waitForCanonicalWorkout() {
  expect(await screen.findByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();
  await waitFor(async () => {
    const snapshot = await createWorkoutRecoveryStorage().load(USER_ID);
    expect(snapshot?.exercises.map((exercise) => exercise.id)).toEqual([WORKOUT_EXERCISE_ID]);
    expect(snapshot?.sets.map((set) => set.id)).toEqual([SET_ID]);
  });
}

afterEach(async () => {
  cleanup();
  await createWorkoutRecoveryStorage().clear(USER_ID);
  await createWorkoutMutationStorage().clear(USER_ID);
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});

describe('workout reliability integration gate', () => {
  it('survives offline edit -> refresh -> reconnect and reconciles the authoritative set', async () => {
    const user = userEvent.setup();
    const backend = createReliabilityBackend();
    const firstRender = renderWorkout(backend);
    await waitForCanonicalWorkout();

    await act(async () => { setOnline(false); });
    expect(await screen.findByText('Offline workout copy')).toBeInTheDocument();

    const weight = await screen.findByRole('spinbutton', { name: 'Set 1 weight in kg' });
    await user.clear(weight);
    await user.type(weight, '110');
    await user.tab();

    expect(await screen.findByText('1 workout change queued')).toBeInTheDocument();
    expect(backend.sets[0]!.weightKg).toBe(100);

    firstRender.unmount();
    renderWorkout(backend);

    expect(await screen.findByText('Offline workout copy')).toBeInTheDocument();
    expect(await screen.findByRole('spinbutton', { name: 'Set 1 weight in kg' })).toHaveValue(110);
    expect(screen.getByText('1 workout change queued')).toBeInTheDocument();

    await act(async () => { setOnline(true); });

    await waitFor(() => expect(backend.sets[0]!.weightKg).toBe(110));
    await waitFor(() => expect(screen.queryByText('1 workout change queued')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Offline workout copy')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toHaveValue(110));
  });

  it('retries an ambiguous committed add with the same idempotency key without duplicating a set', async () => {
    const user = userEvent.setup();
    const backend = createReliabilityBackend();
    backend.failAfterCommitOnce('ADD_SET');
    renderWorkout(backend);
    await waitForCanonicalWorkout();

    await user.click(screen.getByRole('button', { name: '+ Working set' }));

    expect(await screen.findByText('1 workout change queued')).toBeInTheDocument();
    expect(backend.sets).toHaveLength(2);
    expect(backend.addSetEffects).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Retry sync' }));

    await waitFor(() => expect(screen.queryByText('1 workout change queued')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('spinbutton', { name: /Set \d+ weight in kg/ })).toHaveLength(2));
    expect(backend.sets).toHaveLength(2);
    expect(backend.addSetEffects).toBe(1);
    expect(backend.mutationCalls).toHaveLength(2);
    expect(new Set(backend.mutationCalls).size).toBe(1);
  });

  it('preserves the same idempotency key across an app restart and reconciles after automatic retry', async () => {
    const user = userEvent.setup();
    const backend = createReliabilityBackend();
    const mutationStorage = createWorkoutMutationStorage();
    backend.failAfterCommitOnce('ADD_SET');
    const firstRender = renderWorkout(backend);
    await waitForCanonicalWorkout();

    await user.click(screen.getByRole('button', { name: '+ Working set' }));

    expect(await screen.findByText('1 workout change queued')).toBeInTheDocument();
    await waitFor(async () => {
      const [persisted] = await mutationStorage.load(USER_ID);
      expect(persisted).toEqual(expect.objectContaining({
        status: 'pending',
        attemptCount: 1,
        lastAttemptAtMs: expect.any(Number),
      }));
    });
    const [persistedBeforeRestart] = await mutationStorage.load(USER_ID);
    expect(persistedBeforeRestart).toBeDefined();
    expect(backend.sets).toHaveLength(2);

    firstRender.unmount();
    renderWorkout(backend);

    expect(await screen.findByText('1 workout change queued')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('1 workout change queued')).not.toBeInTheDocument(), { timeout: 4_000 });
    await waitFor(() => expect(screen.getAllByRole('spinbutton', { name: /Set \d+ weight in kg/ })).toHaveLength(2));

    expect(backend.sets).toHaveLength(2);
    expect(backend.addSetEffects).toBe(1);
    expect(backend.mutationCalls).toHaveLength(2);
    expect(new Set(backend.mutationCalls)).toEqual(new Set([persistedBeforeRestart!.idempotencyKey]));
    expect(await mutationStorage.load(USER_ID)).toEqual([]);
  });

  it('blocks a stale offline edit and only accepts the explicit server-version recovery choice', async () => {
    const user = userEvent.setup();
    const backend = createReliabilityBackend();
    renderWorkout(backend);
    await waitForCanonicalWorkout();

    await act(async () => { setOnline(false); });
    const weight = await screen.findByRole('spinbutton', { name: 'Set 1 weight in kg' });
    await user.clear(weight);
    await user.type(weight, '110');
    await user.tab();
    expect(await screen.findByText('1 workout change queued')).toBeInTheDocument();

    backend.mutateSetElsewhere(120, 3);
    await act(async () => { setOnline(true); });

    expect(await screen.findByText('Workout changed elsewhere')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeDisabled();
    expect(backend.sets[0]!.weightKg).toBe(120);

    await user.click(screen.getByRole('button', { name: 'Use server version' }));

    await waitFor(() => expect(screen.queryByText('Workout changed elsewhere')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toHaveValue(120));
    expect(screen.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeEnabled();
  });

  it.each([
    ['finish', 'COMPLETED', 'Finish workout'],
    ['cancel', 'CANCELLED', 'Cancel workout'],
  ] as const)('re-checks the server after a %s race and does not revive the terminal workout', async (action, terminalStatus, buttonName) => {
    const user = userEvent.setup();
    const backend = createReliabilityBackend();
    backend.raceLifecycle(action, terminalStatus);
    renderWorkout(backend);
    await waitForCanonicalWorkout();

    await user.click(screen.getByRole('button', { name: buttonName }));

    expect(await screen.findByRole('heading', { name: 'Start a lift' })).toBeInTheDocument();
    expect(backend.workoutStatus).toBe(terminalStatus);
    expect(screen.queryByRole('heading', { name: 'Workout in progress' })).not.toBeInTheDocument();
    await waitFor(async () => {
      expect(await createWorkoutRecoveryStorage().load(USER_ID)).toBeNull();
      expect(await createWorkoutMutationStorage().load(USER_ID)).toEqual([]);
    });
  });
});
