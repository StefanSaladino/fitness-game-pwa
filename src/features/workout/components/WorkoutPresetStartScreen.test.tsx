import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ExercisePickerItem } from '../model';
import { presetWorkoutById } from '../presetWorkouts';
import { WorkoutPresetStartScreen } from './WorkoutPresetStartScreen';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
  preferredWeightUnit: 'KG',
};

function catalogForPreset(id: 'FULL_BODY'): ExercisePickerItem[] {
  return presetWorkoutById(id).exerciseNames.map((canonicalName, index) => ({
    id: `exercise-${index + 1}`,
    canonicalName,
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'OTHER',
    workoutType: 'OTHER',
    aliases: [],
    lastUsedAt: null,
  }));
}

describe('WorkoutPresetStartScreen', () => {
  it('keeps empty-start available and makes preset exercise ownership explicit', () => {
    const onStart = vi.fn(async () => null);
    render(
      <WorkoutPresetStartScreen
        busyAction={null}
        error=""
        exerciseCatalog={catalogForPreset('FULL_BODY')}
        exercisePickerError=""
        exercisePickerStatus="ready"
        onNavigate={() => undefined}
        onRetryExercisePicker={async () => []}
        onSignOut={() => undefined}
        onStart={onStart}
        onStartPreset={async () => null}
        profile={profile}
      />,
    );

    expect(screen.getByText(/Presets choose exercises only/)).toBeInTheDocument();
    expect(screen.getByLabelText('Training tip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start empty lift' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('starts the selected preset only when the exercise catalogue is ready', () => {
    const onStartPreset = vi.fn(async () => null);
    const { rerender } = render(
      <WorkoutPresetStartScreen
        busyAction={null}
        error=""
        exerciseCatalog={[]}
        exercisePickerError=""
        exercisePickerStatus="loading"
        onNavigate={() => undefined}
        onRetryExercisePicker={async () => []}
        onSignOut={() => undefined}
        onStart={async () => null}
        onStartPreset={onStartPreset}
        profile={profile}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Start preset' })[0]).toBeDisabled();

    rerender(
      <WorkoutPresetStartScreen
        busyAction={null}
        error=""
        exerciseCatalog={catalogForPreset('FULL_BODY')}
        exercisePickerError=""
        exercisePickerStatus="ready"
        onNavigate={() => undefined}
        onRetryExercisePicker={async () => []}
        onSignOut={() => undefined}
        onStart={async () => null}
        onStartPreset={onStartPreset}
        profile={profile}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Start preset' })[0]);
    expect(onStartPreset).toHaveBeenCalledWith('FULL_BODY', expect.any(Number));
  });
});
