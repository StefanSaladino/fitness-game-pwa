import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccessService } from './platformAccessService';

vi.mock('./capacity/components/CapacityDashboardController', () => ({
  CapacityDashboardController: () => <div>Real capacity route</div>,
}));

import { PlatformAdminRoute } from './PlatformAdminRoute';

function access(accountStatus: 'ACTIVE' | 'SUSPENDED', isPlatformAdmin: boolean): PlatformAccessService {
  return { load: async () => ({ accountStatus, isPlatformAdmin }) };
}

describe('PlatformAdminRoute', () => {
  it('renders the real route only for an ACTIVE platform administrator', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute pathname="/platform-admin/capacity" accessService={access('ACTIVE', true)} />);
    expect(await screen.findByText('Real capacity route')).toBeInTheDocument();
  });

  it('replace-redirects unauthorized authenticated callers to ordinary home without admin denial copy', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute pathname="/platform-admin/capacity" accessService={access('ACTIVE', false)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText(/Access denied|Admin access required|Platform administrator required/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Real capacity route')).not.toBeInTheDocument();
  });

  it('treats suspended administrators the same as unauthorized callers', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute pathname="/platform-admin/capacity" accessService={access('SUSPENDED', true)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText('Real capacity route')).not.toBeInTheDocument();
  });
});
