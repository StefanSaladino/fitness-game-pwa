import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../model';
import { OnboardingForm } from './OnboardingForm';

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

describe('OnboardingForm', () => {
  it('hides generated placeholder usernames and submits canonical input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => true);
    render(<OnboardingForm busy={false} onSubmit={onSubmit} profile={profile} />);

    const username = screen.getByRole('textbox', { name: 'Username' });
    expect(username).toHaveValue('');

    await user.type(username, 'IronWolf_23');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const back = screen.getByRole('button', { name: 'Back' });
    expect(back).toBeInTheDocument();
    expect(back).not.toHaveTextContent('Back');
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toHaveTextContent('America/Toronto');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Complete setup' }));

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'ironwolf_23',
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyTarget: 5,
    });
  });

  it('shows validation feedback instead of calling the service', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => true);
    render(<OnboardingForm busy={false} onSubmit={onSubmit} profile={profile} />);

    await user.type(screen.getByRole('textbox', { name: 'Username' }), '!!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/username must be 3-32/i)).toBeInTheDocument();
  });
});
