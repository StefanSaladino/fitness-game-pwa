import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppStateSurface } from './AppStateSurface';

describe('AppStateSurface', () => {
  it('keeps state copy and recovery action in one bounded region', () => {
    render(
      <AppStateSurface
        action={<button type="button">Try again</button>}
        description="The latest data could not be loaded."
        eyebrow="Unavailable"
        role="alert"
        title="Something went wrong"
        tone="error"
      />,
    );

    const surface = screen.getByRole('alert');
    expect(surface).toHaveAttribute('data-app-state');
    expect(surface).toHaveAttribute('data-tone', 'error');
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
