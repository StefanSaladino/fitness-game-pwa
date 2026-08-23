import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformInboxMessage } from './model';
import type { PlatformMessageService } from './platformMessageService';
import { UserMessageCenter } from './UserMessageCenter';

const blast: PlatformInboxMessage = {
  messageId: 'blast-1', audienceType: 'ALL', messageType: 'NOTICE', subject: 'Version update', body: 'New workouts are ready.',
  acknowledgementRequired: false, currentRevision: 1, deliveryState: 'DELIVERED', deliveredAt: '2026-08-23T10:00:00Z',
  readAt: null, acknowledgedAt: null, sentAt: '2026-08-23T10:00:00Z', editedAt: null, expiresAt: null, isExpired: false,
};

it('shows an unread all-user blast once as a dismissible what-is-new popup', async () => {
  const markRead = vi.fn().mockResolvedValue(undefined);
  const list = vi.fn()
    .mockResolvedValueOnce({ items: [blast], unreadCount: 1, total: 1 })
    .mockResolvedValueOnce({ items: [{ ...blast, deliveryState: 'READ', readAt: '2026-08-23T10:01:00Z' }], unreadCount: 0, total: 1 });
  const service = { list, markRead, acknowledge: vi.fn() } satisfies PlatformMessageService;
  render(<UserMessageCenter service={service} />);
  expect(await screen.findByRole('dialog', { name: 'Version update' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Version update' })).not.toBeInTheDocument());
  expect(markRead).toHaveBeenCalledWith('blast-1');
});

it('keeps individual messages in the banner and inbox instead of opening the update popup', async () => {
  const service = { list: vi.fn().mockResolvedValue({ items: [{ ...blast, audienceType: 'USER' }], unreadCount: 1, total: 1 }), markRead: vi.fn(), acknowledge: vi.fn() } satisfies PlatformMessageService;
  render(<UserMessageCenter service={service} />);
  expect(await screen.findByLabelText('Unread platform message')).toBeInTheDocument();
  expect(screen.queryByText('WHAT’S NEW')).not.toBeInTheDocument();
});
