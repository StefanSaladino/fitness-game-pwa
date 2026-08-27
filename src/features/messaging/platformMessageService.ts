import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  PLATFORM_MESSAGE_AUDIENCES,
  PLATFORM_MESSAGE_TYPES,
  type PlatformInboxMessage,
  type PlatformInboxPage,
  type PlatformMessageAudience,
  type PlatformMessageDeliveryState,
  type PlatformMessageType,
} from './model';

type InboxRow = {
  message_id: string;
  audience_type: string;
  message_type: string;
  subject: string;
  body: string;
  acknowledgement_required: boolean;
  current_revision: number;
  delivery_state: string;
  delivered_at: string;
  read_at: string | null;
  acknowledged_at: string | null;
  sent_at: string;
  edited_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  unread_count: number | string;
  total_count: number | string;
};

export interface PlatformMessageService {
  list(page?: number, pageSize?: number): Promise<PlatformInboxPage>;
  markRead(messageId: string): Promise<void>;
  acknowledge(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}

const audiences = new Set<string>(PLATFORM_MESSAGE_AUDIENCES);
const types = new Set<string>(PLATFORM_MESSAGE_TYPES);
const states = new Set<string>(['DELIVERED', 'READ', 'ACKNOWLEDGED']);

function count(value: number | string | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('Invalid message count.');
  return parsed;
}

function date(value: string | null, label: string): string | null {
  if (value === null) return null;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}.`);
  return value;
}

function rowToMessage(row: InboxRow): PlatformInboxMessage {
  if (!row.message_id || !row.subject || !row.body || !Number.isInteger(row.current_revision) || row.current_revision < 1) {
    throw new Error('Invalid inbox message.');
  }
  if (!audiences.has(row.audience_type) || !types.has(row.message_type) || !states.has(row.delivery_state)) {
    throw new Error('Invalid inbox message state.');
  }
  return {
    messageId: row.message_id,
    audienceType: row.audience_type as PlatformMessageAudience,
    messageType: row.message_type as PlatformMessageType,
    subject: row.subject,
    body: row.body,
    acknowledgementRequired: row.acknowledgement_required,
    currentRevision: row.current_revision,
    deliveryState: row.delivery_state as PlatformMessageDeliveryState,
    deliveredAt: date(row.delivered_at, 'message delivery date')!,
    readAt: date(row.read_at, 'message read date'),
    acknowledgedAt: date(row.acknowledged_at, 'message acknowledgement date'),
    sentAt: date(row.sent_at, 'message sent date')!,
    editedAt: date(row.edited_at, 'message edited date'),
    expiresAt: date(row.expires_at, 'message expiry date'),
    isExpired: row.is_expired,
  };
}

function requiredId(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error('Message ID is required.');
  return normalized;
}

export function createPlatformMessageService(client: SupabaseClient = getSupabaseClient()): PlatformMessageService {
  return {
    async list(page = 1, pageSize = 20) {
      const { data, error } = await client.rpc('list_my_platform_messages', {
        p_page: page,
        p_page_size: pageSize,
        p_include_expired: false,
      });
      if (error) throw error;
      const rows = (data ?? []) as InboxRow[];
      return {
        items: rows.map(rowToMessage),
        unreadCount: rows.length ? count(rows[0].unread_count) : 0,
        total: rows.length ? count(rows[0].total_count) : 0,
      };
    },
    async markRead(messageId) {
      const { error } = await client.rpc('mark_platform_message_read', { p_message_id: requiredId(messageId) });
      if (error) throw error;
    },
    async acknowledge(messageId) {
      const { error } = await client.rpc('acknowledge_platform_message', { p_message_id: requiredId(messageId) });
      if (error) throw error;
    },
    async deleteMessage(messageId) {
      const { error } = await client.rpc('delete_my_platform_message', { p_message_id: requiredId(messageId) });
      if (error) throw error;
    },
  };
}
