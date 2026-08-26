import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import { CardioScreen } from './CardioScreen';

const profile: OnboardingProfile = {
  id: 'u',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-21T00:00:00Z',
  preferredWeightUnit: 'KG',
};

const snapshot = {
  summary: {
    totalActivities: 1,
    totalActiveMinutes: 30,
    last30DaysActivities: 1,
    last30DaysActiveMinutes: 30,
    last30DaysBonusXp: 10,
    lastActivityAt: '2026-08-21T12:00:00Z',
  },
  history: [{
    workoutId: 'w1',
    category: 'RUNNING' as const,
    scoringDate: '2026-08-21',
    startedAt: '2026-08-21T12:00:00Z',
    endedAt: '2026-08-21T12:30:00Z',
    activeDurationSeconds: 1800,
    qualifiesCardioBonus: true,
    dailyBonusXp: 10,
    notes: 'Easy',
  }],
};

describe('CardioScreen', () => {
  it('keeps cardio secondary while exposing quick category, duration, tier, summary, and history controls', async () => {
    const user = userEvent.setup();
    const log = vi.fn(async () => true);
    const remove = vi.fn(async () => true);
    const onNavigate = vi.fn();

    render(
      <CardioScreen
        busy={false}
        error=""
        log={log}
        onNavigate={onNavigate}
        onSignOut={vi.fn()}
        profile={profile}
        remove={remove}
        retry={vi.fn()}
        snapshot={snapshot}
        status="ready"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Log cardio' })).toBeInTheDocument();
    expect(screen.getByText(/never counts as a lifting day/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Activity' })).not.toBeInTheDocument();

    const activityRail = screen.getByRole('group', { name: 'Cardio activity' });
    expect(activityRail).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Running' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Walking / hiking' }));
    expect(screen.getByRole('button', { name: 'Walking / hiking' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/needs at least 30 active minutes/i)).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'Active minutes' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Active minutes' }), '45');
    expect(screen.getByText('+15 XP')).toBeInTheDocument();

    const notes = screen.getByText('Add a note').closest('details');
    expect(notes).not.toBeNull();
    expect(notes).not.toHaveAttribute('open');

    await user.click(screen.getByText('Add a note'));
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Hill walk');

    await user.click(screen.getByRole('button', { name: 'Log cardio' }));
    expect(log).toHaveBeenCalledWith({
      category: 'WALKING_HIKING',
      activeDurationMinutes: 45,
      notes: 'Hill walk',
    });

    expect(screen.getByText('10 XP bonus')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(screen.getByText(/weekly lifting consistency is unchanged/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete Running/ }));
    expect(remove).toHaveBeenCalledWith('w1');

    await user.click(screen.getByRole('button', { name: 'Back to Lift' }));
    expect(onNavigate).toHaveBeenCalledWith('workouts');
  });

  it('shows the correct below-minimum context without blocking a valid cardio log', async () => {
    const user = userEvent.setup();
    const log = vi.fn(async () => true);

    render(
      <CardioScreen
        busy={false}
        error=""
        log={log}
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        remove={vi.fn(async () => true)}
        retry={vi.fn()}
        snapshot={snapshot}
        status="ready"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'HIIT' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Active minutes' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Active minutes' }), '10');

    expect(screen.getByText('Below bonus minimum')).toBeInTheDocument();
    expect(screen.getByText(/HIIT needs at least 12 active minutes/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log cardio' }));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      category: 'HIIT',
      activeDurationMinutes: 10,
    }));
  });
});
