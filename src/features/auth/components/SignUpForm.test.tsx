import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignUpForm } from './SignUpForm';

describe('SignUpForm', () => {
  it('does not submit when password confirmation differs', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    render(<SignUpForm busy={false} onBack={() => undefined} onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Display name' }), 'Stefan');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'stefan@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password456');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });
});
