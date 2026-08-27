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
  const service = { list, markRead, acknowledge: vi.fn(), deleteMessage: vi.fn() } satisfies PlatformMessageService;
  render(<UserMessageCenter service={service} />);
  expect(await screen.findByRole('dialog', { name: 'Version update' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Version update' })).not.toBeInTheDocument());
  expect(markRead).toHaveBeenCalledWith('blast-1');
});

it('keeps individual messages behind the app-bar inbox badge instead of opening a competing banner', async () => {
  const service = { list: vi.fn().mockResolvedValue({ items: [{ ...blast, audienceType: 'USER' }], unreadCount: 1, total: 1 }), markRead: vi.fn(), acknowledge: vi.fn(), deleteMessage: vi.fn() } satisfies PlatformMessageService;
  render(<UserMessageCenter service={service} />);
  expect(await screen.findByRole('button', { name: 'Messages, 1 unread' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Unread platform message')).not.toBeInTheDocument();
  expect(screen.queryByText('WHAT’S NEW')).not.toBeInTheDocument();
});

it('deletes an ordinary received message only after a deliberate confirmation', async () => {
  const user = userEvent.setup();
  const message = { ...blast, audienceType: 'USER' as const, deliveryState: 'READ' as const, readAt: '2026-08-23T10:01:00Z' };
  const list = vi.fn()
    .mockResolvedValueOnce({ items: [message], unreadCount: 0, total: 1 })
    .mockResolvedValueOnce({ items: [], unreadCount: 0, total: 0 });
  const deleteMessage = vi.fn().mockResolvedValue(undefined);
  const service = { list, markRead: vi.fn(), acknowledge: vi.fn(), deleteMessage } satisfies PlatformMessageService;

  render(<UserMessageCenter service={service} />);
  await user.click(await screen.findByRole('button', { name: 'Messages' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('dialog', { name: 'Delete message?' })).toBeInTheDocument();
  expect(deleteMessage).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(screen.getByText('No messages yet.')).toBeInTheDocument());
  expect(deleteMessage).toHaveBeenCalledWith('blast-1');
});

it('requires the current acknowledgement before exposing deletion for a required message', async () => {
  const required = { ...blast, audienceType: 'USER' as const, messageType: 'ACTION_REQUIRED' as const, acknowledgementRequired: true };
  const service = { list: vi.fn().mockResolvedValue({ items: [required], unreadCount: 1, total: 1 }), markRead: vi.fn(), acknowledge: vi.fn(), deleteMessage: vi.fn() } satisfies PlatformMessageService;
  render(<UserMessageCenter service={service} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Messages, 1 unread' }));
  expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
