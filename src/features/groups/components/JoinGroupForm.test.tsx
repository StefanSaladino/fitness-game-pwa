import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { JoinGroupForm } from './JoinGroupForm';

const token = '6ccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('JoinGroupForm', () => {
  it('accepts an invite URL and delegates the canonical token', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<JoinGroupForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByRole('textbox', { name: 'Invite' }),
      `https://example.test/join?invite=${token}`,
    );
    await user.click(screen.getByRole('button', { name: 'Join group' }));

    expect(onSubmit).toHaveBeenCalledWith(token);
  });

  it('rejects invalid invite text before calling the controller', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<JoinGroupForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Invite' }), 'not-an-invite');
    await user.click(screen.getByRole('button', { name: 'Join group' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/valid group invite/i)).toBeInTheDocument();
  });
});
