import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  it('connects label, hint, and validation error semantics', () => {
    const { rerender } = render(<TextField hint="3–32 characters" label="Username" />);
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAccessibleDescription('3–32 characters');

    rerender(<TextField error="Username is already taken" hint="3–32 characters" label="Username" />);
    const field = screen.getByRole('textbox', { name: 'Username' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Username is already taken');
  });

  it('supports an optional trailing control without changing input semantics', () => {
    render(<TextField label="Password" trailingControl={<button type="button">Show password</button>} type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });
});
