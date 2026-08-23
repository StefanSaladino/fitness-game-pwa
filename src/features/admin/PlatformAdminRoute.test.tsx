import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccessService } from './platformAccessService';

vi.mock('./capacity/components/CapacityDashboardController', () => ({
  CapacityDashboardController: () => <div>Real capacity route</div>,
}));
vi.mock('./accounts/components/UserAdministrationController', () => ({
  UserAdministrationController: ({ currentUserId }: { currentUserId: string }) => (
    <div>Real users route for {currentUserId}</div>
  ),
}));

import { PlatformAdminRoute } from './PlatformAdminRoute';

function access(accountStatus: 'ACTIVE' | 'SUSPENDED', isPlatformAdmin: boolean): PlatformAccessService {
  return { load: async () => ({ accountStatus, isPlatformAdmin }) };
}

describe('PlatformAdminRoute', () => {
  it('renders the real route only for an ACTIVE platform administrator', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/capacity" accessService={access('ACTIVE', true)} />);
    expect(await screen.findByText('Real capacity route')).toBeInTheDocument();
  });

  it('renders the account administration route for an ACTIVE platform administrator', async () => {
    window.history.replaceState({}, '', '/platform-admin/users');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/users" accessService={access('ACTIVE', true)} />);
    expect(await screen.findByText('Real users route for admin-1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Users' })[0]).toHaveAttribute('aria-current', 'page');
  });

  it('replace-redirects unauthorized authenticated callers to ordinary home without admin denial copy', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/capacity" accessService={access('ACTIVE', false)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText(/Access denied|Admin access required|Platform administrator required/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Real capacity route')).not.toBeInTheDocument();
  });

  it('treats suspended administrators the same as unauthorized callers', async () => {
    window.history.replaceState({}, '', '/platform-admin/capacity');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/capacity" accessService={access('SUSPENDED', true)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText('Real capacity route')).not.toBeInTheDocument();
  });

  it('canonicalizes the authorized admin root to capacity', async () => {
    window.history.replaceState({}, '', '/platform-admin');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin" accessService={access('ACTIVE', true)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/platform-admin/capacity'));
  });

  it('replace-redirects unknown admin paths to ordinary home', async () => {
    window.history.replaceState({}, '', '/platform-admin/unknown');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/unknown" accessService={access('ACTIVE', true)} />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
