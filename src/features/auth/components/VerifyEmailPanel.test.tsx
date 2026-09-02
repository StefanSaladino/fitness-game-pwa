import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VerifyEmailPanel } from './VerifyEmailPanel';

describe('VerifyEmailPanel', () => {
  it('lets a user request another confirmation email without creating another account', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(async () => true);

    render(
      <VerifyEmailPanel
        busy={false}
        email="member@example.com"
        error=""
        message=""
        onBackToSignIn={vi.fn()}
        onResend={onResend}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it('surfaces resend feedback', () => {
    render(
      <VerifyEmailPanel
        busy={false}
        email="member@example.com"
        error=""
        message="A new confirmation email has been sent."
        onBackToSignIn={vi.fn()}
        onResend={vi.fn(async () => true)}
      />,
    );

    expect(screen.getByText('A new confirmation email has been sent.')).toBeInTheDocument();
  });
});
