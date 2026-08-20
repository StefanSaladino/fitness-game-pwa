import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ExercisePickerService } from '../exercisePickerService';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutSetService } from '../workoutSetService';
import { createWorkoutRecoveryStorage } from '../recovery/workoutRecoveryStorage';
import { createWorkoutMutationStorage } from '../mutations/workoutMutationStorage';
import { createWorkoutMutationQueueItem } from '../mutations/workoutMutationModel';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import type { ActiveWorkoutRecoverySnapshot } from '../recovery/workoutRecoveryModel';
import { WorkoutController } from './WorkoutController';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
};

const snapshot: ActiveWorkoutRecoverySnapshot = {
  version: 1,
  userId: 'user-1',
  savedAtMs: Date.parse('2026-08-20T03:00:00.000Z'),
  session: {
    id: 'workout-1', userId: 'user-1', startedAt: '2026-08-20T02:55:00.000Z', activeDurationSeconds: 300,
    timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null, lastResumedAt: '2026-08-20T02:55:00.000Z',
  },
  exercises: [
    { id: 'we-1', workoutId: 'workout-1', exerciseId: 'e-1', orderIndex: 0, revision: 0, canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS' },
  ],
  sets: [
    { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
  ],
  ui: {
    weightUnit: 'LB',
    setDrafts: {
      'set-1': { setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT' },
    },
  },
};

function offlineError(): Promise<never> {
  return Promise.reject(new Error('network unavailable'));
}

afterEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});

describe('WorkoutController local recovery', () => {
  it('renders the local workout, exercise, set, and unsaved draft before remote reads recover', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    createWorkoutRecoveryStorage(window.localStorage).save(snapshot);

    const service = { loadActiveWorkout: vi.fn(offlineError) } as unknown as WorkoutService;
    const exerciseService = { loadWorkoutExercises: vi.fn(offlineError) } as unknown as WorkoutExerciseService;
    const pickerService = { loadCatalog: vi.fn(offlineError) } as unknown as ExercisePickerService;
    const setService = { loadWorkoutSets: vi.fn(offlineError), saveSet: vi.fn() } as unknown as WorkoutSetService;

    render(
      <WorkoutController
        exerciseService={exerciseService}
        onNavigate={() => undefined}
        onSignOut={() => undefined}
        pickerService={pickerService}
        profile={profile}
        service={service}
        setService={setService}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Offline workout copy');
    expect(screen.getByLabelText('Set 1 weight in lb')).toHaveValue(225);
    expect(screen.getByLabelText('Set 1 reps')).toHaveValue(6);
    expect(screen.getByRole('button', { name: 'Add exercise' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Set 1 weight in lb'), { target: { value: '230' } });
    fireEvent.blur(screen.getByLabelText('Set 1 weight in lb'));

    await waitFor(() => {
      const saved = createWorkoutRecoveryStorage(window.localStorage).load('user-1');
      expect(saved?.ui.setDrafts['set-1']?.weight).toBe('230');
    });
    expect(setService.saveSet).not.toHaveBeenCalled();
    const queued = createWorkoutMutationStorage(window.localStorage).load('user-1');
    expect(queued).toHaveLength(1);
    expect(queued[0]).toEqual(expect.objectContaining({ kind: 'SAVE_SET', workoutId: 'workout-1' }));
  });
  it('surfaces an explicit server-version choice when a recovered workout is no longer active', async () => {
    createWorkoutRecoveryStorage(window.localStorage).save(snapshot);
    const mutationStorage = createWorkoutMutationStorage(window.localStorage);
    const queued = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      {
        kind: 'SAVE_SET',
        payload: {
          workoutSetId: 'set-1', setType: 'WORKING', weightKg: 110, reps: 3,
          bodyweightMode: null, completed: false, expectedRevision: 0,
        },
      },
      '55555555-5555-4555-8555-555555555555',
      100,
    );
    mutationStorage.save('user-1', [{ ...queued, status: 'conflict', lastError: 'WORKOUT_CONFLICT: Workout is no longer active on the server.' }]);

    const onNavigate = vi.fn();
    const service = { loadActiveWorkout: vi.fn(async () => null) } as unknown as WorkoutService;
    const exerciseService = { loadWorkoutExercises: vi.fn(async () => []) } as unknown as WorkoutExerciseService;
    const pickerService = { loadCatalog: vi.fn(async () => []) } as unknown as ExercisePickerService;
    const setService = { loadWorkoutSets: vi.fn(async () => []) } as unknown as WorkoutSetService;
    const mutationService = { apply: vi.fn(async () => undefined) } as WorkoutMutationService;

    render(
      <WorkoutController
        exerciseService={exerciseService}
        mutationService={mutationService}
        onNavigate={onNavigate}
        onSignOut={() => undefined}
        pickerService={pickerService}
        profile={profile}
        service={service}
        setService={setService}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Workout changed elsewhere' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use server version' }));

    await waitFor(() => expect(mutationStorage.load('user-1')).toEqual([]));
    expect(createWorkoutRecoveryStorage(window.localStorage).load('user-1')).toBeNull();
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

});
