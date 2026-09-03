import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../onboarding';
import { ProfileSettingsForm } from './ProfileSettingsForm';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan37',
  displayName: 'Stefan Saladino',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  profileCode: 'FG-28944FB7-7CC8-4A31-B07D-2D908D25C811',
  preferredWeightUnit: 'KG',
};

describe('ProfileSettingsForm invite ID', () => {
  it('shows the complete invite ID in its own row and copies the full value', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');

    render(
      <ProfileSettingsForm
        busy={false}
        error=""
        mode="profile"
        notice=""
        onSave={vi.fn(async () => profile)}
        profile={profile}
      />,
    );

    expect(screen.getByText(profile.profileCode!)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy invite ID' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(profile.profileCode));
    expect(screen.getByRole('button', { name: 'Copy invite ID' })).toHaveTextContent('Copied');
  });
});
