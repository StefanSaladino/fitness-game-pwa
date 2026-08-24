import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';

const mocks = vi.hoisted(() => ({
  clearFeedback: vi.fn(),
  signIn: vi.fn(async () => true),
  signUp: vi.fn(async () => ({ ok: true, requiresEmailConfirmation: false } as const)),
  requestPasswordReset: vi.fn(async () => true),
  updatePassword: vi.fn(async () => true),
}));

vi.mock('./hooks/useAuthActions', () => ({ useAuthActions: () => ({ busy: false, error: '', message: '', ...mocks }) }));

describe('AuthScreen', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('moves between auth states without changing routes', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(mocks.clearFeedback).toHaveBeenCalledTimes(3);
  });
});
