import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createPlatformMessagingService } from './platformMessagingService';

function client(rpc: ReturnType<typeof vi.fn>): SupabaseClient { return { rpc } as unknown as SupabaseClient; }

describe('platform messaging service', () => {
  it('uses the guarded server preview and forces a full-app audience to NOTICE', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ preview_id: 'p1', audience_type: 'ALL', audience_label: 'All eligible users', recipient_count: 5, confirmation_phrase: 'SEND TO 5 USERS', expires_at: '2026-08-23T12:00:00Z' }], error: null });
    const service = createPlatformMessagingService(client(rpc));
    await expect(service.preview('ALL', null, 'WARNING')).resolves.toMatchObject({ recipientCount: 5, audienceType: 'ALL' });
    expect(rpc).toHaveBeenCalledWith('preview_platform_message_audience', { p_audience_type: 'ALL', p_target_user_id: null, p_target_group_id: null, p_message_type: 'NOTICE' });
  });

  it('sends only through the idempotent preview-backed RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ message_id: 'm1' }], error: null });
    const service = createPlatformMessagingService(client(rpc));
    await expect(service.send({ previewId: 'p1', subject: 'Version update', body: 'New workouts are available.', acknowledgementRequired: false, expiresAt: null, confirmation: 'SEND TO 5 USERS', auditReason: 'Release announcement' })).resolves.toBe('m1');
    expect(rpc).toHaveBeenCalledWith('send_platform_message', expect.objectContaining({ p_preview_id: 'p1', p_acknowledgement_required: false, p_confirmation: 'SEND TO 5 USERS' }));
  });
});
