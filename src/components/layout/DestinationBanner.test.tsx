import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DestinationBanner } from './DestinationBanner';

describe('DestinationBanner', () => {
  it('adds visual identity without adding a second announced content image', () => {
    const { container } = render(
      <DestinationBanner aria-labelledby="destination-title" imageSrc="/destination.jpg">
        <h1 id="destination-title">Lift</h1>
      </DestinationBanner>,
    );

    const banner = container.querySelector('[data-app-media-banner]');
    expect(banner).toHaveAttribute('data-app-surface', 'primary');
    expect(banner).toHaveAttribute('aria-labelledby', 'destination-title');
    expect(banner?.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
