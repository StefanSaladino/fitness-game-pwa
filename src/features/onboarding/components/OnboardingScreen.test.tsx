import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('separates identity, training preferences, and goal into focused steps', async () => {
    const user = userEvent.setup();
    render(<OnboardingScreen busy={false} onSubmit={vi.fn(async () => true)} profile={profile} />);

    expect(screen.getByRole('heading', { name: 'Set up your profile' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Timezone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Weekly lifting target' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ironwolf');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Weekly lifting target' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument();
  });
});
