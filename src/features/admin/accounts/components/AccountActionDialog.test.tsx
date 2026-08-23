import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformAccountDetail } from '../model';
import { AccountActionDialog } from './AccountActionDialog';

const account: PlatformAccountDetail = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'alpha',
  displayName: 'Alpha User',
  accountStatus: 'DELETION_PENDING',
  createdAt: '2026-08-20T12:00:00.000Z',
  lastSignInAt: null,
  isPlatformAdmin: false,
  suspensionReviewAt: null,
  deletionRequestedAt: '2026-08-22T12:00:00.000Z',
  statusReason: 'User request',
  statusUpdatedAt: '2026-08-22T12:00:00.000Z',
  deletionRequestedBy: accountId('22222222'),
};

function accountId(prefix: string): string {
  return `${prefix}-2222-4222-8222-222222222222`;
}

describe('AccountActionDialog', () => {
  it('requires the exact case-sensitive permanent-deletion phrase', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onCancel = vi.fn();
    render(
      <AccountActionDialog
        account={account}
        action="CONFIRM_DELETION"
        busy={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByRole('textbox', { name: /Type DELETE alpha to confirm/ });
    const submit = screen.getByRole('button', { name: 'Delete permanently' });
    expect(submit).toBeDisabled();
    await user.type(input, 'delete alpha');
    expect(submit).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'DELETE alpha');
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({ confirmation: 'DELETE alpha' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('validates the audited reason before calling a lifecycle action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <AccountActionDialog
        account={{ ...account, accountStatus: 'SUSPENDED' }}
        action="RESTORE"
        busy={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Audit reason' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Restore account' }));
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
