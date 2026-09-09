import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, WorkoutExercise } from '../model';
import { ActiveWorkoutScreen } from './WorkoutSessionScreen';

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

const workout: ActiveWorkoutSession = {
  id: 'workout-1',
  userId: 'user-1',
  status: 'IN_PROGRESS',
  startedAt: '2026-09-09T02:00:00.000Z',
  endedAt: null,
  activeDurationSeconds: 0,
  timezoneAtStart: 'America/Toronto',
  scoringDate: '2026-09-08',
  pausedAt: null,
  lastResumedAt: '2026-09-09T02:00:00.000Z',
};

const exercise: WorkoutExercise = {
  id: 'we-1',
  workoutId: 'workout-1',
  exerciseId: 'exercise-1',
  orderIndex: 0,
  supersetGroupId: null,
  supersetOrder: null,
  revision: 0,
  canonicalName: 'Barbell Bench Press',
  measurementType: 'WEIGHT_REPS',
};

function renderScreen(trackedExerciseIds: string[], onSetExerciseAnalyticsTracked: (exerciseId: string, tracked: boolean) => Promise<boolean>) {
  return render(
    <ActiveWorkoutScreen
      analyticsTrackingStatus="ready"
      busyAction={null}
      compositionBusyAction={null}
      compositionError=""
      error=""
      exerciseCatalog={[]}
      exercisePickerError=""
      exercisePickerStatus="ready"
      exerciseStatus="ready"
      exercises={[exercise]}
      onAddAdvancedSet={async () => true}
      onAddExercise={async () => true}
      onAddSet={async () => true}
      onCancel={async () => undefined}
      onClearSuperset={async () => true}
      onCopySet={async () => true}
      onFinish={async () => undefined}
      onMoveExercise={async () => true}
      onNavigate={() => undefined}
      onPause={async () => undefined}
      onRemoveExercise={async () => true}
      onRemoveSet={async () => true}
      onResume={async () => undefined}
      onRetryExercisePicker={async () => []}
      onRetryExercises={async () => [exercise]}
      onRetrySets={async () => []}
      onSaveAdvancedSet={async () => true}
      onSaveSet={async () => true}
      onSaveSuperset={async () => true}
      onSetExerciseAnalyticsTracked={onSetExerciseAnalyticsTracked}
      onSignOut={() => undefined}
      profile={profile}
      setBusy={null}
      setError=""
      setStatus="ready"
      trackedExerciseIds={trackedExerciseIds}
      workout={workout}
      workoutSets={[]}
    />,
  );
}

describe('active workout analytics tracking', () => {
  it('uses the canonical exercise id when toggling Track in analytics', () => {
    const onSetExerciseAnalyticsTracked = vi.fn(async () => true);
    renderScreen([], onSetExerciseAnalyticsTracked);

    const checkbox = screen.getByRole('checkbox', { name: /Track in analytics/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    expect(onSetExerciseAnalyticsTracked).toHaveBeenCalledWith('exercise-1', true);
  });

  it('reflects an already tracked canonical exercise', () => {
    renderScreen(['exercise-1'], vi.fn(async () => true));

    expect(screen.getByRole('checkbox', { name: /Track in analytics/i })).toBeChecked();
  });
});
