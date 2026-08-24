import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../model';
import { OnboardingScreen } from './OnboardingScreen';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'u_123456789012345678901234567890',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 3,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: null,
  preferredWeightUnit: 'KG',
};

describe('OnboardingScreen', () => {
  it('renders the single real profile setup contract without a fake second onboarding step', () => {
    render(<OnboardingScreen busy={false} onSubmit={vi.fn(async () => true)} profile={profile} />);

    expect(screen.getByRole('heading', { name: 'Set up your profile.' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Weekly lifting target' })).toBeInTheDocument();
    expect(screen.queryByText(/step 1 of 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/group creation or joining comes immediately after/i)).not.toBeInTheDocument();
  });
});
