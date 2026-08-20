import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, WorkoutExercise } from '../model';
import { ActiveWorkoutScreen, WorkoutStartScreen } from './WorkoutSessionScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
};

const active: ActiveWorkoutSession = {
  id: 'workout-1', userId: 'user-1', status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 60_000).toISOString(), endedAt: null,
  activeDurationSeconds: 0, timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null,
  lastResumedAt: new Date(Date.now() - 60_000).toISOString(),
};

const exercises: WorkoutExercise[] = [
  { id: 'we-1', workoutId: 'workout-1', exerciseId: 'exercise-1', orderIndex: 0, canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS' },
  { id: 'we-2', workoutId: 'workout-1', exerciseId: 'exercise-2', orderIndex: 1, canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS' },
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

  it('renders ordered canonical exercises with restrained move and remove controls', () => {
    const onMoveExercise = vi.fn(async () => true);
    const onRemoveExercise = vi.fn(async () => true);
    render(activeScreen({ exercises, onMoveExercise, onRemoveExercise }));

    expect(screen.getByRole('heading', { name: '2 in this lift' })).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Pull Up')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move Pull Up up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Barbell Bench Press' }));

    expect(onMoveExercise).toHaveBeenCalledWith('we-2', 0);
    expect(onRemoveExercise).toHaveBeenCalledWith('we-1');
  });

  it('renders independent per-set entry for weighted exercises', () => {
    render(activeScreen({
      exercises: [exercises[0]],
      workoutSets: [
        { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WARMUP', weightKg: 60, reps: 10, bodyweightMode: null, completed: false, completedAt: null },
        { id: 'set-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null },
      ],
    }));

    expect(screen.getByRole('region', { name: 'Barbell Bench Press sets' })).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 weight in kg')).toHaveValue(60);
    expect(screen.getByLabelText('Set 2 weight in kg')).toHaveValue(100);
    expect(screen.getByRole('button', { name: 'Copy last set' })).toBeInTheDocument();
  });

});
