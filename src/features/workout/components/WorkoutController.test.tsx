import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ExercisePickerService } from '../exercisePickerService';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutSetService } from '../workoutSetService';
import { createWorkoutRecoveryStorage } from '../recovery/workoutRecoveryStorage';
import { createWorkoutMutationStorage } from '../mutations/workoutMutationStorage';
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
    { id: 'we-1', workoutId: 'workout-1', exerciseId: 'e-1', orderIndex: 0, canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS' },
  ],
  sets: [
    { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null },
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
});
