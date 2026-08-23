import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminRoute } from '../../src/features/admin/PlatformAdminRoute';
import type { PlatformMessageHistoryItem } from '../../src/features/admin/messaging/model';
import { PlatformMessagingController } from '../../src/features/admin/messaging/components/PlatformMessagingController';
import type { PlatformMessagingService } from '../../src/features/admin/messaging/platformMessagingService';
import { UserMessageCenter } from '../../src/features/messaging/UserMessageCenter';
import type { PlatformInboxMessage } from '../../src/features/messaging/model';
import type { PlatformMessageService } from '../../src/features/messaging/platformMessageService';

const SENT_AT = '2026-08-23T16:00:00.000Z';

describe('platform administration integration security gate', () => {
  it('never constructs a privileged route controller for an unauthorized deep link', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const messagingService: PlatformMessagingService = {
      searchUsers: vi.fn(),
      searchGroups: vi.fn(),
      preview: vi.fn(),
      send: vi.fn(),
      list,
      edit: vi.fn(),
      withdraw: vi.fn(),
    };

    window.history.replaceState({}, '', '/platform-admin/messages?target=victim-id');
    render(
      <PlatformAdminRoute
        accessService={{ load: async () => ({ accountStatus: 'ACTIVE', isPlatformAdmin: false }) }}
        currentUserId="ordinary-user"
        messagingService={messagingService}
        pathname="/platform-admin/messages"
      />,
    );

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(list).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Messages' })).not.toBeInTheDocument();
  });

  it('delivers a confirmed full-app notice as a dismiss-once what-is-new popup', async () => {
    const user = userEvent.setup();
    let history: PlatformMessageHistoryItem[] = [];
    let deliveryState: PlatformInboxMessage['deliveryState'] = 'DELIVERED';

    const adminService: PlatformMessagingService = {
      searchUsers: vi.fn().mockResolvedValue([]),
      searchGroups: vi.fn().mockResolvedValue([]),
      preview: vi.fn().mockResolvedValue({
        previewId: 'preview-155',
        audienceType: 'ALL',
        audienceLabel: 'All active users',
        recipientCount: 3,
        confirmationPhrase: 'SEND TO 3 USERS',
        expiresAt: '2026-08-23T16:10:00.000Z',
      }),
      send: vi.fn(async () => {
        history = [{
          messageId: 'message-155',
          audienceType: 'ALL',
          audienceLabel: 'All active users',
          messageType: 'NOTICE',
          subject: 'Training update',
          body: 'A new training update is ready for everyone.',
          acknowledgementRequired: false,
          expiresAt: null,
          status: 'SENT',
          currentRevision: 1,
          recipientCount: 3,
          readCount: 0,
          acknowledgedCount: 0,
          sentAt: SENT_AT,
          editedAt: null,
          withdrawnAt: null,
        }];
        return 'message-155';
      }),
      async list() { return { items: history, total: history.length }; },
      edit: vi.fn(),
      withdraw: vi.fn(),
    };

    const adminView = render(<PlatformMessagingController service={adminService} />);
    await screen.findByText('No messages have been sent.');
    await user.type(screen.getByLabelText('Subject'), 'Training update');
    await user.type(screen.getByLabelText('Message'), 'A new training update is ready for everyone.');
    await user.type(screen.getByLabelText('Audit reason'), 'Phase 15.5 integration release notice');
    await user.click(screen.getByRole('button', { name: 'Preview audience' }));
    await user.type(await screen.findByLabelText('Exact send confirmation'), 'SEND TO 3 USERS');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Message sent to 3 users.');
    expect(adminService.send).toHaveBeenCalledWith(expect.objectContaining({
      acknowledgementRequired: false,
      confirmation: 'SEND TO 3 USERS',
      previewId: 'preview-155',
    }));
    adminView.unmount();

    const inboxMessage = (): PlatformInboxMessage => ({
      messageId: 'message-155',
      audienceType: 'ALL',
      messageType: 'NOTICE',
      subject: 'Training update',
      body: 'A new training update is ready for everyone.',
      acknowledgementRequired: false,
      currentRevision: 1,
      deliveryState,
      deliveredAt: SENT_AT,
      readAt: deliveryState === 'READ' ? '2026-08-23T16:01:00.000Z' : null,
      acknowledgedAt: null,
      sentAt: SENT_AT,
      editedAt: null,
      expiresAt: null,
      isExpired: false,
    });
    const userService: PlatformMessageService = {
      async list() {
        return { items: [inboxMessage()], unreadCount: deliveryState === 'DELIVERED' ? 1 : 0, total: 1 };
      },
      markRead: vi.fn(async () => { deliveryState = 'READ'; }),
      acknowledge: vi.fn(),
    };

    render(<UserMessageCenter service={userService} />);
    expect(await screen.findByRole('dialog', { name: 'Training update' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Training update' })).not.toBeInTheDocument());
    expect(userService.markRead).toHaveBeenCalledWith('message-155');
  });
});
