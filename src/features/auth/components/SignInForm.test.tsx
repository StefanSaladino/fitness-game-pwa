import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm } from './SignInForm';

describe('SignInForm', () => {
  it('validates locally before delegating normalized credentials', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => true);

    render(
      <SignInForm
        busy={false}
        onCreateAccount={() => undefined}
        onForgotPassword={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'USER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' });
  });
});
