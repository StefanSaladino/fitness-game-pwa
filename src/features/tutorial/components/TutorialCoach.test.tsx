import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { TutorialService } from '../tutorialService';
import { TutorialCoach } from './TutorialCoach';

const profile: OnboardingProfile = {
  id: 'real-account-id-that-must-not-render',
  username: 'real_private_username',
  displayName: 'Real Private Name',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-09-25T00:00:00.000Z',
  preferredWeightUnit: 'KG',
  tutorialCompletedVersion: 0,
};

describe('TutorialCoach', () => {
  it('moves between tutorial stages without exposing the real profile in coach copy', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tutorial?step=0');

    render(
      <TutorialCoach
        onProfileChanged={vi.fn()}
        profile={profile}
        required
        service={{ complete: vi.fn(async () => 1) }}
      />,
    );

    expect(screen.queryByText('Real Private Name')).not.toBeInTheDocument();
    expect(screen.queryByText('@real_private_username')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next screen' }));

    expect(window.location.pathname).toBe('/tutorial');
    expect(new URLSearchParams(window.location.search).get('step')).toBe('1');
  });

  it('changes the final top action to Go to Home page and persists completion', async () => {
    const user = userEvent.setup();
    const complete = vi.fn(async () => 1);
    const onProfileChanged = vi.fn(async () => undefined);
    window.history.replaceState({}, '', '/tutorial?step=6');

    render(
      <TutorialCoach
        onProfileChanged={onProfileChanged}
        profile={profile}
        required
        service={{ complete } satisfies TutorialService}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Skip tutorial' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Go to Home page' }),
    );

    expect(complete).toHaveBeenCalledWith(1);
    expect(onProfileChanged).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');
  });

  it('closes replay mode without rewriting completion before the final step', async () => {
    const user = userEvent.setup();
    const complete = vi.fn(async () => 1);
    window.history.replaceState(
      {},
      '',
      '/tutorial?step=0&from=settings',
    );

    render(
      <TutorialCoach
        onProfileChanged={vi.fn()}
        profile={{ ...profile, tutorialCompletedVersion: 1 }}
        required={false}
        returnPath="/settings"
        service={{ complete }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(complete).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/settings');
  });
});
