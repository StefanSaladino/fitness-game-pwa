import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import { TutorialExperience } from './TutorialExperience';

const realProfile: OnboardingProfile = {
  id: 'real-account-id',
  username: 'real_private_username',
  displayName: 'Real Private Name',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 7,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-09-25T00:00:00.000Z',
  preferredWeightUnit: 'LB',
  tutorialCompletedVersion: 0,
};

describe('TutorialExperience privacy boundary', () => {
  it('renders the real Home component with tutorial fixture data, not real account data', async () => {
    window.history.replaceState({}, '', '/tutorial?step=0');

    render(
      <TutorialExperience
        onProfileChanged={vi.fn()}
        profile={realProfile}
        required
        service={{ complete: vi.fn(async () => 1) }}
      />,
    );

    expect((await screen.findAllByText('Demo Athlete')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Real Private Name')).not.toBeInTheDocument();
    expect(screen.queryByText('@real_private_username')).not.toBeInTheDocument();
  });
});
