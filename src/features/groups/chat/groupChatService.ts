import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import { GROUP_CHAT_REACTIONS, type GroupChatMessage, type GroupChatPage, type GroupChatCursor, type GroupChatReaction } from './model';

const PROFILE_PICTURE_BUCKET = 'profile-pictures';
const PAGE_SIZE = 30;
const reactionTypes = new Set<string>(GROUP_CHAT_REACTIONS);

type ChatRow = {
  message_id: string;
  author_user_id: string;
  username: string;
  display_name: string;
  profile_picture_path: string | null;
  body: string | null;
  created_at: string;
  deleted_at: string | null;
  can_delete: boolean;
  fire_count: number | string;
  strong_count: number | string;
  clap_count: number | string;
  heart_count: number | string;
  laugh_count: number | string;
  my_reaction: string | null;
};

export interface GroupChatService {
  loadMessages(groupId: string, cursor?: GroupChatCursor | null): Promise<GroupChatPage>;
  postMessage(groupId: string, body: string): Promise<string>;
  setReaction(groupId: string, messageId: string, reaction: GroupChatReaction | null): Promise<void>;
  deleteMessage(groupId: string, messageId: string): Promise<void>;
  subscribe(groupId: string, onChange: () => void): () => void;
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function date(value: string | null, label: string): string | null {
  if (value === null) return null;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}.`);
  return value;
}

function count(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('Invalid group chat reaction count.');
  return parsed;
}

export function createGroupChatService(client: SupabaseClient = getSupabaseClient()): GroupChatService {
  const pictureUrl = (path: string | null): string | null => path
    ? client.storage.from(PROFILE_PICTURE_BUCKET).getPublicUrl(path).data.publicUrl
    : null;

  return {
    async loadMessages(groupId, cursor = null) {
      const { data, error } = await client.rpc('list_group_chat_messages', {
        p_group_id: required(groupId, 'Group ID'),
        p_limit: PAGE_SIZE + 1,
        p_before_created_at: cursor?.createdAt ?? null,
        p_before_message_id: cursor?.messageId ?? null,
      });
      if (error) throw error;
      const rows = (data ?? []) as ChatRow[];
      const hasMore = rows.length > PAGE_SIZE;
      const items: GroupChatMessage[] = rows.slice(0, PAGE_SIZE).map((row) => {
        if (!row.message_id || !row.author_user_id || !row.username || !row.display_name) throw new Error('Invalid group chat message.');
        const createdAt = date(row.created_at, 'group chat date')!;
        const deletedAt = date(row.deleted_at, 'group chat deletion date');
        const myReaction = row.my_reaction && reactionTypes.has(row.my_reaction)
          ? row.my_reaction as GroupChatReaction
          : null;
        return {
          id: row.message_id,
          authorUserId: row.author_user_id,
          username: row.username,
          displayName: row.display_name,
          profilePictureUrl: pictureUrl(row.profile_picture_path),
          body: deletedAt ? null : row.body,
          createdAt,
          deletedAt,
          canDelete: Boolean(row.can_delete) && !deletedAt,
          reactions: {
            FIRE: count(row.fire_count),
            STRONG: count(row.strong_count),
            CLAP: count(row.clap_count),
            HEART: count(row.heart_count),
            LAUGH: count(row.laugh_count),
          },
          myReaction,
        };
      });
      const last = items.at(-1);
      return {
        items,
        nextCursor: hasMore && last ? { createdAt: last.createdAt, messageId: last.id } : null,
      };
    },
    async postMessage(groupId, body) {
      const { data, error } = await client.rpc('post_group_chat_message', {
        p_group_id: required(groupId, 'Group ID'),
        p_body: required(body, 'Message'),
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Invalid posted group message.');
      return data;
    },
    async setReaction(groupId, messageId, reaction) {
      const { error } = await client.rpc('set_group_chat_reaction', {
        p_group_id: required(groupId, 'Group ID'),
        p_message_id: required(messageId, 'Message ID'),
        p_reaction_type: reaction,
      });
      if (error) throw error;
    },
    async deleteMessage(groupId, messageId) {
      const { error } = await client.rpc('delete_group_chat_message', {
        p_group_id: required(groupId, 'Group ID'),
        p_message_id: required(messageId, 'Message ID'),
      });
      if (error) throw error;
    },
    subscribe(groupId, onChange) {
      const channel = client
        .channel(`group-chat:${required(groupId, 'Group ID')}`, { config: { private: true } })
        .on('broadcast', { event: 'group_chat_changed' }, () => onChange())
        .subscribe();
      return () => { void client.removeChannel(channel); };
    },
  };
}
