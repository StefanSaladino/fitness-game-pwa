import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopSetLoadingScreen } from './TopSetLoadingScreen';

describe('TopSetLoadingScreen', () => {
  it('exposes an indeterminate loading state without fabricated progress', () => {
    const { container } = render(<TopSetLoadingScreen label="Loading your profile…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your profile');
    expect(container.querySelector('[data-system-state="loading"] [data-app-state]')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
