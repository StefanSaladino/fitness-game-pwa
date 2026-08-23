import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccountDetail } from '../../src/features/admin/accounts/model';
import type { PlatformAccountAdminService } from '../../src/features/admin/accounts/platformAccountAdminService';
import { UserAdministrationController } from '../../src/features/admin/accounts/components/UserAdministrationController';

function memoryService(): PlatformAccountAdminService & { restore: ReturnType<typeof vi.fn> } {
  let account: PlatformAccountDetail = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'alpha',
    displayName: 'Alpha User',
    accountStatus: 'SUSPENDED',
    createdAt: '2026-08-20T12:00:00.000Z',
    lastSignInAt: '2026-08-21T12:00:00.000Z',
    isPlatformAdmin: false,
    suspensionReviewAt: null,
    deletionRequestedAt: null,
    statusReason: 'Policy review',
    statusUpdatedAt: '2026-08-22T12:00:00.000Z',
    deletionRequestedBy: null,
  };
  const restore = vi.fn(async (_userId: string, reason: string) => {
    account = { ...account, accountStatus: 'ACTIVE', statusReason: reason };
  });
  return {
    async list(query = {}) {
      return { items: [{ ...account }], total: 1, page: query.page ?? 1, pageSize: query.pageSize ?? 25 };
    },
    async get() { return { ...account }; },
    suspend: vi.fn(),
    restore,
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
    confirmDeletion: vi.fn(),
  };
}

describe('platform account administration integration journey', () => {
  it('selects a suspended account, restores it with an audit reason, and refreshes status', async () => {
    const user = userEvent.setup();
    const service = memoryService();
    render(<UserAdministrationController currentUserId="admin-user-id" service={service} />);

    await user.click(await screen.findByRole('button', { name: /Alpha User/ }));
    await user.click(await screen.findByRole('button', { name: 'Restore account' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore account' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Audit reason' }), 'Review completed');
    await user.click(within(dialog).getByRole('button', { name: 'Restore account' }));

    await waitFor(() => expect(service.restore).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'Review completed',
    ));
    expect(await screen.findByText('Account restored.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend account' })).toBeInTheDocument();
  });
});
