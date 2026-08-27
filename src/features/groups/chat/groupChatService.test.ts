import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createGroupChatService } from './groupChatService';

function clientFixture() {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'list_group_chat_messages') return {
      data: [{
        message_id: 'message-1', author_user_id: 'user-1', username: 'stefan', display_name: 'Stefan',
        profile_picture_path: 'user-1/profile.webp', body: 'Great workout today.', created_at: '2026-08-27T18:00:00Z',
        deleted_at: null, can_delete: true, fire_count: '2', strong_count: '0', clap_count: '1',
        heart_count: '3', laugh_count: '0', my_reaction: 'HEART',
      }],
      error: null,
    };
    if (name === 'post_group_chat_message') return { data: 'message-2', error: null };
    return { data: null, error: null };
  });
  let broadcastHandler: (() => void) | null = null;
  const channel = {
    on: vi.fn((_kind, _filter, handler: () => void) => { broadcastHandler = handler; return channel; }),
    subscribe: vi.fn(() => channel),
  };
  const client = {
    rpc,
    storage: { from: vi.fn(() => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }) })) },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return { client, rpc, channel, getBroadcastHandler: () => broadcastHandler };
}

describe('group chat service', () => {
  it('maps member-only chat rows and routes all mutations through guarded RPCs', async () => {
    const fixture = clientFixture();
    const service = createGroupChatService(fixture.client as unknown as SupabaseClient);
    const page = await service.loadMessages('group-1');
    expect(page.items[0]).toEqual(expect.objectContaining({
      id: 'message-1', body: 'Great workout today.', canDelete: true, myReaction: 'HEART',
      reactions: { FIRE: 2, STRONG: 0, CLAP: 1, HEART: 3, LAUGH: 0 },
      profilePictureUrl: 'https://cdn.test/user-1/profile.webp',
    }));
    expect(fixture.rpc).toHaveBeenCalledWith('list_group_chat_messages', expect.objectContaining({ p_group_id: 'group-1', p_limit: 31 }));

    await expect(service.postMessage('group-1', 'Keep going')).resolves.toBe('message-2');
    await service.setReaction('group-1', 'message-1', 'FIRE');
    await service.deleteMessage('group-1', 'message-1');
    expect(fixture.rpc).toHaveBeenCalledWith('post_group_chat_message', { p_group_id: 'group-1', p_body: 'Keep going' });
    expect(fixture.rpc).toHaveBeenCalledWith('set_group_chat_reaction', { p_group_id: 'group-1', p_message_id: 'message-1', p_reaction_type: 'FIRE' });
    expect(fixture.rpc).toHaveBeenCalledWith('delete_group_chat_message', { p_group_id: 'group-1', p_message_id: 'message-1' });
  });

  it('uses a private group channel as a content-free refresh signal and cleans it up', () => {
    const fixture = clientFixture();
    const service = createGroupChatService(fixture.client as unknown as SupabaseClient);
    const onChange = vi.fn();
    const dispose = service.subscribe('group-1', onChange);
    expect(fixture.client.channel).toHaveBeenCalledWith('group-chat:group-1', { config: { private: true } });
    expect(fixture.channel.on).toHaveBeenCalledWith('broadcast', { event: 'group_chat_changed' }, expect.any(Function));
    fixture.getBroadcastHandler()?.();
    expect(onChange).toHaveBeenCalledTimes(1);
    dispose();
    expect(fixture.client.removeChannel).toHaveBeenCalledWith(fixture.channel);
  });
});
