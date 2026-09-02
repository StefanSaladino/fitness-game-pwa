import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmSignupScreen } from './ConfirmSignupScreen';

const mocks = vi.hoisted(() => ({
  confirmSignUp: vi.fn(),
}));

vi.mock('./authService', () => ({
  confirmSignUp: mocks.confirmSignUp,
}));

describe('ConfirmSignupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/confirm-signup?token_hash=test-token&type=email');
    mocks.confirmSignUp.mockResolvedValue({ data: {}, error: null });
  });

  it('does not consume the confirmation token until the user explicitly confirms', async () => {
    const user = userEvent.setup();
    render(<ConfirmSignupScreen />);

    expect(mocks.confirmSignUp).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm email' }));

    expect(mocks.confirmSignUp).toHaveBeenCalledWith('test-token');
    expect(await screen.findByRole('heading', { name: 'You’re confirmed' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('hands a newly created confirmation session directly to the app route', async () => {
    const user = userEvent.setup();
    mocks.confirmSignUp.mockResolvedValue({
      data: { session: { user: { id: 'member-id' } } },
      error: null,
    });

    render(<ConfirmSignupScreen />);
    await user.click(screen.getByRole('button', { name: 'Confirm email' }));

    expect(mocks.confirmSignUp).toHaveBeenCalledWith('test-token');
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
  });

  it('turns an already-used or expired token into a recovery-oriented message', async () => {
    const user = userEvent.setup();
    mocks.confirmSignUp.mockResolvedValue({
      data: {},
      error: { message: 'Email link is invalid or has expired' },
    });

    render(<ConfirmSignupScreen />);
    await user.click(screen.getByRole('button', { name: 'Confirm email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your email may already be confirmed');
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/');
  });
});
