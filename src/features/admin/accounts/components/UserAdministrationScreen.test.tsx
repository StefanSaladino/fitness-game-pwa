import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccountDetail, PlatformAccountDirectoryPage } from '../model';
import { UserAdministrationScreen } from './UserAdministrationScreen';

const account: PlatformAccountDetail = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'alpha',
  displayName: 'Alpha User',
  accountStatus: 'ACTIVE',
  createdAt: '2026-08-20T12:00:00.000Z',
  lastSignInAt: '2026-08-21T12:00:00.000Z',
  isPlatformAdmin: false,
  suspensionReviewAt: null,
  deletionRequestedAt: null,
  statusReason: null,
  statusUpdatedAt: '2026-08-22T12:00:00.000Z',
  deletionRequestedBy: null,
};

const directory: PlatformAccountDirectoryPage = {
  items: [account],
  total: 1,
  page: 1,
  pageSize: 25,
};

function renderScreen(overrides: Partial<React.ComponentProps<typeof UserAdministrationScreen>> = {}) {
  const props: React.ComponentProps<typeof UserAdministrationScreen> = {
    currentUserId: 'admin-user-id',
    filters: { search: '', status: null, page: 1, pageSize: 25 },
    directory,
    directoryState: 'ready',
    detail: account,
    detailState: 'ready',
    selectedUserId: account.userId,
    onApplyFilters: vi.fn(),
    onChangePage: vi.fn(),
    onSelectUser: vi.fn(),
    onClearSelection: vi.fn(),
    onRetryDirectory: vi.fn(),
    onRetryDetail: vi.fn(),
    onOpenAction: vi.fn(),
    ...overrides,
  };
  render(<UserAdministrationScreen {...props} />);
  return props;
}

describe('UserAdministrationScreen', () => {
  it('renders only the approved bounded account fields and lifecycle actions', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Users', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(account.userId)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request deletion' })).toBeInTheDocument();
    expect(screen.queryByText(/email address|session token|ip address|device telemetry/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /message|activity|report/i })).not.toBeInTheDocument();
  });

  it('applies search and explicit status filters', async () => {
    const user = userEvent.setup();
    const props = renderScreen({ detail: null, detailState: 'idle', selectedUserId: null });
    await user.type(screen.getByRole('searchbox'), 'alpha');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(props.onApplyFilters).toHaveBeenCalledWith('alpha', null);
    await user.click(screen.getByRole('button', { name: 'Suspended' }));
    expect(props.onApplyFilters).toHaveBeenCalledWith('alpha', 'SUSPENDED');
  });

  it('never offers lifecycle mutation controls for the current administrator', () => {
    renderScreen({ currentUserId: account.userId });
    expect(screen.getByText(/current administrator account/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request deletion' })).not.toBeInTheDocument();
  });
});
