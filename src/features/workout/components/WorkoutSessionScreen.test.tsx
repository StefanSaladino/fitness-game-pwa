import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, WorkoutExercise } from '../model';
import { ActiveWorkoutScreen, WorkoutStartScreen, WorkoutSyncConflictScreen } from './WorkoutSessionScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
  preferredWeightUnit: 'KG',
};

const active: ActiveWorkoutSession = {
  id: 'workout-1', userId: 'user-1', status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 60_000).toISOString(), endedAt: null,
  activeDurationSeconds: 0, timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null,
  lastResumedAt: new Date(Date.now() - 60_000).toISOString(),
};

const exercises: WorkoutExercise[] = [
  { id: 'we-1', workoutId: 'workout-1', exerciseId: 'exercise-1', orderIndex: 0, revision: 0, canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS' },
  { id: 'we-2', workoutId: 'workout-1', exerciseId: 'exercise-2', orderIndex: 1, revision: 0, canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS' },
];

const compositionProps = {
  compositionBusyAction: null,
  compositionError: '',
  exerciseCatalog: [],
  exercisePickerError: '',
  exercisePickerStatus: 'ready' as const,
  exerciseStatus: 'ready' as const,
  exercises: [] as WorkoutExercise[],
  onAddExercise: vi.fn(async () => true),
  onMoveExercise: vi.fn(async () => true),
  onRemoveExercise: vi.fn(async () => true),
  onRetryExercisePicker: vi.fn(async () => []),
  onRetryExercises: vi.fn(async () => [] as WorkoutExercise[]),
  workoutSets: [],
  setStatus: 'ready' as const,
  setBusy: null,
  setError: '',
  onRetrySets: vi.fn(async () => []),
  onAddSet: vi.fn(async () => true),
  onCopySet: vi.fn(async () => true),
  onSaveSet: vi.fn(async () => true),
  onRemoveSet: vi.fn(async () => true),
};

function activeScreen(overrides: Partial<ComponentProps<typeof ActiveWorkoutScreen>> = {}) {
  return (
    <ActiveWorkoutScreen
      busyAction={null}
      error=""
      onCancel={async () => undefined}
      onFinish={async () => undefined}
      onNavigate={() => undefined}
      onPause={async () => undefined}
      onResume={async () => undefined}
      onSignOut={() => undefined}
      profile={profile}
      workout={active}
      {...compositionProps}
      {...overrides}
    />
  );
}

describe('workout session presentation', () => {
  it('starts the visible clock immediately while session creation is still in flight', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime('2026-08-19T20:00:00.000Z');
      const onStart = vi.fn(() => new Promise<unknown>(() => undefined));
      render(<WorkoutStartScreen busyAction={null} error="" onNavigate={() => undefined} onSignOut={() => undefined} onStart={onStart} profile={profile} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start Lift' }));
      expect(onStart).toHaveBeenCalledWith(Date.parse('2026-08-19T20:00:00.000Z'));
      expect(screen.getByText('00:00')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4_000));
      expect(screen.getByText('00:04')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a running persisted session with pause and finish controls', () => {
    render(activeScreen());
    expect(screen.getByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Synced');
  });

  it('shows resume instead of pause when the session is persisted as paused', () => {
    render(activeScreen({ workout: { ...active, activeDurationSeconds: 60, pausedAt: new Date().toISOString(), lastResumedAt: null } }));
    expect(screen.getByRole('heading', { name: 'Workout paused' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume timer' })).toBeInTheDocument();
  });

  it('does not add extra seconds when a paused response retains the previous resume timestamp', () => {
    const pausedAt = new Date();
    const lastResumedAt = new Date(pausedAt.getTime() - 60_000);
    render(activeScreen({
      workout: {
        ...active,
        activeDurationSeconds: 60,
        pausedAt: pausedAt.toISOString(),
        lastResumedAt: lastResumedAt.toISOString(),
      },
    }));
    expect(screen.getByText('01:00')).toBeInTheDocument();
  });

  it('freezes at the exact pause click even when the pause request takes four seconds', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime('2026-08-19T20:01:00.000Z');
      const onPause = vi.fn(() => new Promise<unknown>(() => undefined));
      render(activeScreen({
        onPause,
        workout: {
          ...active,
          activeDurationSeconds: 0,
          pausedAt: null,
          lastResumedAt: '2026-08-19T20:00:00.000Z',
        },
      }));

      fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
      expect(onPause).toHaveBeenCalledWith(Date.parse('2026-08-19T20:01:00.000Z'));
      expect(screen.getByText('01:00')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4_000));
      expect(screen.getByText('01:00')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resumes the visible clock immediately instead of waiting for the resume request', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime('2026-08-19T20:02:00.000Z');
      const onResume = vi.fn(() => new Promise<unknown>(() => undefined));
      render(activeScreen({
        onResume,
        workout: {
          ...active,
          activeDurationSeconds: 60,
          pausedAt: '2026-08-19T20:01:00.000Z',
          lastResumedAt: null,
        },
      }));

      fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
      expect(onResume).toHaveBeenCalledWith(Date.parse('2026-08-19T20:02:00.000Z'));
      expect(screen.getByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4_000));
      expect(screen.getByText('01:04')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the real exercise picker from the active workout', () => {
    render(activeScreen());
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(screen.getByRole('dialog', { name: 'Add exercise' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search all exercises' })).toBeInTheDocument();
  });

  it('renders ordered canonical exercises with approved icon slots and collapsible set sections', () => {
    const onMoveExercise = vi.fn(async () => true);
    const onRemoveExercise = vi.fn(async () => true);
    render(activeScreen({ exercises, onMoveExercise, onRemoveExercise }));

    expect(screen.getByRole('heading', { name: '2 in this lift' })).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Pull Up')).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press').closest('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Pull Up').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Move Pull Up up' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Barbell Bench Press').closest('button') as HTMLButtonElement);
    expect(screen.getByText('Barbell Bench Press').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Pull Up').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Move Barbell Bench Press down' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Barbell Bench Press').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Barbell Bench Press' }));
    expect(onRemoveExercise).toHaveBeenCalledWith('we-1');

    fireEvent.click(screen.getByText('Pull Up').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Move Pull Up up' }));
    expect(onMoveExercise).toHaveBeenCalledWith('we-2', 0);
  });

  it('renders independent dense per-set entry for weighted exercises without invented RPE or notes fields', () => {
    render(activeScreen({
      exercises: [exercises[0]],
      workoutSets: [
        { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WARMUP', weightKg: 60, reps: 10, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
        { id: 'set-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
      ],
    }));

    expect(screen.getByRole('region', { name: 'Barbell Bench Press sets' })).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 weight in kg')).toHaveValue(60);
    expect(screen.getByLabelText('Set 2 weight in kg')).toHaveValue(100);
    expect(screen.getByRole('button', { name: 'Copy last set' })).toBeInTheDocument();
    expect(screen.queryByText('RPE')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('requires explicit confirmation before cancelling and keeps the safe action primary', async () => {
    const onCancel = vi.fn(async () => undefined);
    render(activeScreen({ onCancel }));

    const cancelButton = screen.getByRole('button', { name: 'Cancel workout' });
    fireEvent.click(cancelButton);
    expect(screen.getByRole('dialog', { name: 'Cancel this workout?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep workout' })).toHaveFocus();
    expect(document.querySelector('[inert][aria-hidden="true"]')).not.toBeNull();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Keep workout' }));
    expect(screen.queryByRole('dialog', { name: 'Cancel this workout?' })).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel workout' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this workout?' });
    fireEvent.click(dialog.querySelector('button:last-child') as HTMLButtonElement);
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('traps keyboard focus inside the cancel dialog and restores it on escape', () => {
    render(activeScreen());

    const cancelButton = screen.getByRole('button', { name: 'Cancel workout' });
    fireEvent.click(cancelButton);
    const keepButton = screen.getByRole('button', { name: 'Keep workout' });
    const confirmButton = screen.getByRole('dialog', { name: 'Cancel this workout?' }).querySelector('button:last-child') as HTMLButtonElement;

    keepButton.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();

    confirmButton.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(keepButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Cancel this workout?' })).not.toBeInTheDocument();
  });

  it('gates new structural actions while a mutation is pending and exposes an explicit retry', () => {
    const onRetryMutationQueue = vi.fn(async () => undefined);
    render(activeScreen({
      mutationQueuePendingCount: 1,
      mutationQueueStatus: 'idle',
      onRetryMutationQueue,
    }));

    expect(screen.getByRole('status')).toHaveTextContent('1 workout change queued');
    expect(screen.getByRole('button', { name: 'Add exercise' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
    expect(onRetryMutationQueue).toHaveBeenCalledTimes(1);
  });

  it('keeps the offline-copy identity visible while also showing queued workout changes', () => {
    render(activeScreen({
      recoveryState: 'offline',
      mutationQueuePendingCount: 1,
      mutationQueueStatus: 'idle',
    }));

    expect(screen.getByRole('status')).toHaveTextContent('Offline workout copy');
    expect(screen.getByRole('status')).toHaveTextContent('1 workout change queued');
  });

  it('blocks workout edits on a revision conflict and offers the explicit server-version recovery action', () => {
    const onDiscardMutationConflict = vi.fn(async () => undefined);
    render(activeScreen({
      mutationQueuePendingCount: 1,
      mutationQueueStatus: 'conflict',
      mutationQueueError: 'This workout changed elsewhere. Use the server version before continuing.',
      onDiscardMutationConflict,
    }));

    expect(screen.getByRole('status')).toHaveTextContent('Workout changed elsewhere');
    expect(screen.getByRole('button', { name: 'Add exercise' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Retry sync' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use server version' }));
    expect(onDiscardMutationConflict).toHaveBeenCalledTimes(1);
  });

  it('renders a dedicated recovery screen when the server no longer has the recovered workout active', () => {
    const onUseServerVersion = vi.fn(async () => undefined);
    render(
      <WorkoutSyncConflictScreen
        message="The server workout is complete."
        onNavigate={() => undefined}
        onSignOut={() => undefined}
        onUseServerVersion={onUseServerVersion}
        profile={profile}
        resolving={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Workout changed elsewhere' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use server version' }));
    expect(onUseServerVersion).toHaveBeenCalledTimes(1);
  });

  it('keeps the recovered workout visible while gating structural actions but allowing queued set completion offline', () => {
    const onSaveSet = vi.fn(async () => true);
    render(activeScreen({
      onSaveSet,
      recoveryState: 'offline',
      initialWeightUnit: 'LB',
      recoveryDrafts: {
        'set-1': { setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT' },
      },
      exercises: [exercises[0]],
      workoutSets: [
        { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
      ],
    }));

    expect(screen.getByRole('status')).toHaveTextContent('Offline workout copy');
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 weight in lb')).toHaveValue(225);
    expect(screen.getByLabelText('Set 1 weight in lb')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mark set 1 complete' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark set 1 complete' }));
    expect(onSaveSet).toHaveBeenCalledWith('set-1', expect.objectContaining({ completed: true, reps: 6 }));

    expect(screen.getByRole('button', { name: 'Add exercise' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeDisabled();
  });
});
