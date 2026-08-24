import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateGroupForm } from './CreateGroupForm';

describe('CreateGroupForm', () => {
  it('normalizes the group name before delegating creation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<CreateGroupForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Group name' }), '  Thursday   Night Crew  ');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Thursday Night Crew' });
  });

  it('keeps invalid names inside the presentation layer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CreateGroupForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/group name must be between/i)).toBeInTheDocument();
  });

  it('supports the compact zero-group composition without duplicating section headings', () => {
    render(<CreateGroupForm compact onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Group name' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Make the group yours.' })).not.toBeInTheDocument();
  });
});
