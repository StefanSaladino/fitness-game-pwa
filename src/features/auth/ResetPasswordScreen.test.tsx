import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordScreen } from './ResetPasswordScreen';

const mocks = vi.hoisted(() => ({
  auth: { session: null as unknown, loading: false, passwordRecovery: false },
  updatePassword: vi.fn(async () => true),
}));

vi.mock('./AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('./hooks/useAuthActions', () => ({
  useAuthActions: () => ({ busy: false, error: '', message: '', clearFeedback: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), requestPasswordReset: vi.fn(), updatePassword: mocks.updatePassword }),
}));

describe('ResetPasswordScreen', () => {
  beforeEach(() => { mocks.auth.session = null; mocks.auth.loading = false; mocks.auth.passwordRecovery = false; mocks.updatePassword.mockClear(); });

  it('fails closed when the recovery session is unavailable', () => {
    render(<ResetPasswordScreen />);
    expect(screen.getByRole('heading', { name: 'Link unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to sign in' })).toHaveAttribute('href', '/');
  });

  it('validates matching passwords before delegating the update', async () => {
    const user = userEvent.setup();
    mocks.auth.passwordRecovery = true;
    render(<ResetPasswordScreen />);
    await user.type(screen.getByLabelText('New password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password456');
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });
});
