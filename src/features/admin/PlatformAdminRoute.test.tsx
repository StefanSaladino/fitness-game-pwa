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
vi.mock('./moderation/components/ModerationWorkspaceController', () => ({
  ModerationWorkspaceController: ({ currentUserId, initialTargetUserId }: { currentUserId: string; initialTargetUserId?: string | null }) => (
    <div>Real moderation route for {currentUserId} target {initialTargetUserId ?? 'none'}</div>
  ),
}));
vi.mock('./messaging/components/PlatformMessagingController', () => ({
  PlatformMessagingController: ({ initialTargetUserId }: { initialTargetUserId?: string | null }) => (
    <div>Real messages route target {initialTargetUserId ?? 'none'}</div>
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

  it('renders moderation and preserves a directory-selected review target', async () => {
    window.history.replaceState({}, '', '/platform-admin/moderation?target=target-1');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/moderation" accessService={access('ACTIVE', true)} />);
    expect(await screen.findByText('Real moderation route for admin-1 target target-1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Moderation' })[0]).toHaveAttribute('aria-current', 'page');
  });

  it('renders messaging and preserves a directory-selected recipient', async () => {
    window.history.replaceState({}, '', '/platform-admin/messages?target=target-2');
    render(<PlatformAdminRoute currentUserId="admin-1" pathname="/platform-admin/messages" accessService={access('ACTIVE', true)} />);
    expect(await screen.findByText('Real messages route target target-2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Messages' })[0]).toHaveAttribute('aria-current', 'page');
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
