import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ExercisePickerService } from '../exercisePickerService';
import type { ExercisePickerItem, WorkoutExercise } from '../model';
import { presetWorkoutById } from '../presetWorkouts';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutSetService } from '../workoutSetService';
import { WorkoutController } from './WorkoutController';

const profile: OnboardingProfile = {
  id: 'user-preset',
  username: 'preset-user',
  displayName: 'Preset User',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
  preferredWeightUnit: 'KG',
};

const preset = presetWorkoutById('FULL_BODY');
const catalog: ExercisePickerItem[] = preset.exerciseNames.map((canonicalName, index) => ({
  id: `exercise-${index + 1}`,
  canonicalName,
  measurementType: 'WEIGHT_REPS',
  primaryMuscleGroup: 'OTHER',
  workoutType: 'OTHER',
  aliases: [],
  lastUsedAt: null,
}));

const session = {
  id: 'workout-preset',
  userId: profile.id,
  status: 'IN_PROGRESS' as const,
  startedAt: '2026-08-23T22:00:00.000Z',
  endedAt: null,
  activeDurationSeconds: 0,
  timezoneAtStart: 'America/Toronto',
  scoringDate: '2026-08-23',
  pausedAt: null,
  lastResumedAt: '2026-08-23T22:00:00.000Z',
};

describe('WorkoutController preset start', () => {
  it('resolves the selected preset through the canonical catalogue and starts it atomically', async () => {
    const startPresetWorkout = vi.fn(async () => session);
    const service = {
      loadActiveWorkout: vi.fn(async () => null),
      startOrResumeWorkout: vi.fn(async () => session),
      startPresetWorkout,
    } as unknown as WorkoutService;
    const pickerService = { loadCatalog: vi.fn(async () => catalog) } as ExercisePickerService;
    const presetExercises: WorkoutExercise[] = catalog.map((exercise, index) => ({
      id: `workout-exercise-${index + 1}`,
      workoutId: session.id,
      exerciseId: exercise.id,
      orderIndex: index,
      supersetGroupId: null,
      supersetOrder: null,
      revision: 0,
      canonicalName: exercise.canonicalName,
      measurementType: exercise.measurementType,
    }));
    const exerciseService = {
      loadWorkoutExercises: vi.fn(async () => presetExercises),
    } as unknown as WorkoutExerciseService;
    const setService = {
      loadWorkoutSets: vi.fn(async () => []),
    } as unknown as WorkoutSetService;
    const mutationService = { apply: vi.fn(async () => undefined) } as WorkoutMutationService;

    render(
      <WorkoutController
        exerciseService={exerciseService}
        mutationService={mutationService}
        onNavigate={() => undefined}
        onSignOut={() => undefined}
        pickerService={pickerService}
        profile={profile}
        service={service}
        setService={setService}
      />,
    );

    expect(await screen.findByText('Full Body Strength')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start preset' })[0]);

    await waitFor(() => expect(startPresetWorkout).toHaveBeenCalledTimes(1));
    expect(startPresetWorkout).toHaveBeenCalledWith(
      catalog.map((exercise) => exercise.id),
      expect.any(Number),
    );
    expect(await screen.findByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();
  });
});
