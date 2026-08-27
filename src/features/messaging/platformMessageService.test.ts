import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createPlatformMessageService } from './platformMessageService';

const row = {
  message_id: 'message-1', audience_type: 'ALL', message_type: 'NOTICE', subject: 'Version update', body: 'A new version is available.',
  acknowledgement_required: false, current_revision: 1, delivery_state: 'DELIVERED', delivered_at: '2026-08-23T10:00:00Z',
  read_at: null, acknowledged_at: null, sent_at: '2026-08-23T10:00:00Z', edited_at: null, expires_at: null,
  is_expired: false, unread_count: '1', total_count: '1',
};

describe('platform message service', () => {
  it('maps the private inbox RPC without exposing other recipients', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });
    const service = createPlatformMessageService({ rpc } as unknown as SupabaseClient);
    await expect(service.list()).resolves.toMatchObject({ unreadCount: 1, total: 1, items: [{ audienceType: 'ALL', deliveryState: 'DELIVERED' }] });
    expect(rpc).toHaveBeenCalledWith('list_my_platform_messages', { p_page: 1, p_page_size: 20, p_include_expired: false });
  });

  it('uses separate guarded read, acknowledgement, and recipient-deletion boundaries', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createPlatformMessageService({ rpc } as unknown as SupabaseClient);
    await service.markRead('message-1');
    await service.acknowledge('message-2');
    await service.deleteMessage('message-3');
    expect(rpc).toHaveBeenNthCalledWith(1, 'mark_platform_message_read', { p_message_id: 'message-1' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'acknowledge_platform_message', { p_message_id: 'message-2' });
    expect(rpc).toHaveBeenNthCalledWith(3, 'delete_my_platform_message', { p_message_id: 'message-3' });
  });
});
