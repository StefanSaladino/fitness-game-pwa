import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingStatusScreen } from './OnboardingStatusScreen';

describe('OnboardingStatusScreen', () => {
  it('uses the Top Set loading experience without fabricated progress', () => {
    render(<OnboardingStatusScreen status="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your profile');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('offers the real retry action after a profile-load error', async () => {
    const retry = vi.fn(async () => undefined);
    render(<OnboardingStatusScreen message="Profile unavailable." onRetry={retry} status="error" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Profile unavailable.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
