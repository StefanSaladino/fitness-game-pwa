import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from './ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  it('validates locally and delegates a normalized email', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => true);
    render(<ForgotPasswordForm busy={false} onBack={() => undefined} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Send reset email' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Email' }), ' USER@EXAMPLE.COM ');
    await user.click(screen.getByRole('button', { name: 'Send reset email' }));
    expect(onSubmit).toHaveBeenCalledWith('user@example.com');
  });

  it('shows the enumeration-safe completion response without retaining the form', () => {
    render(<ForgotPasswordForm busy={false} message="If an account exists for that email, password-reset instructions have been sent." onBack={() => undefined} onSubmit={async () => true} />);
    expect(screen.getByRole('status')).toHaveTextContent('If an account exists');
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeInTheDocument();
  });
});
