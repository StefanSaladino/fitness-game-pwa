import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession } from '../model';
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

describe('workout session presentation', () => {
  it('starts a lift from the dedicated workout surface', () => {
    const onStart = vi.fn(async () => undefined);
    render(<WorkoutStartScreen busyAction={null} error="" onNavigate={() => undefined} onSignOut={() => undefined} onStart={onStart} profile={profile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Lift' }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('shows a running persisted session with pause and finish controls', () => {
    render(<ActiveWorkoutScreen busyAction={null} error="" onCancel={async () => undefined} onFinish={async () => undefined} onNavigate={() => undefined} onPause={async () => undefined} onResume={async () => undefined} onSignOut={() => undefined} profile={profile} workout={active} />);
    expect(screen.getByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeInTheDocument();
  });

  it('shows resume instead of pause when the session is persisted as paused', () => {
    render(<ActiveWorkoutScreen busyAction={null} error="" onCancel={async () => undefined} onFinish={async () => undefined} onNavigate={() => undefined} onPause={async () => undefined} onResume={async () => undefined} onSignOut={() => undefined} profile={profile} workout={{ ...active, activeDurationSeconds: 60, pausedAt: new Date().toISOString(), lastResumedAt: null }} />);
    expect(screen.getByRole('heading', { name: 'Workout paused' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume timer' })).toBeInTheDocument();
  });
});
