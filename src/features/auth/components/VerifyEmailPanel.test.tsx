import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VerifyEmailPanel } from './VerifyEmailPanel';

describe('VerifyEmailPanel', () => {
  it('shows the destination email and returns to sign in on request', async () => {
    const user = userEvent.setup();
    const onBackToSignIn = vi.fn();
    render(<VerifyEmailPanel email="user@example.com" onBackToSignIn={onBackToSignIn} />);
    expect(screen.getByRole('status')).toHaveTextContent('user@example.com');
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(onBackToSignIn).toHaveBeenCalledTimes(1);
  });
});
