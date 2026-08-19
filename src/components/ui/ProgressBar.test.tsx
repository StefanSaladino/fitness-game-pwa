import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes the authoritative numeric value accessibly and clamps overflow', () => {
    const { rerender } = render(<ProgressBar label="Level progress" max={1000} value={750} />);
    expect(screen.getByRole('progressbar', { name: 'Level progress' })).toHaveAttribute('aria-valuenow', '750');

    rerender(<ProgressBar label="Level progress" max={1000} value={1200} />);
    expect(screen.getByRole('progressbar', { name: 'Level progress' })).toHaveAttribute('aria-valuenow', '1000');
  });
});
