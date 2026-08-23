import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import { PLATFORM_MESSAGE_AUDIENCES, PLATFORM_MESSAGE_TYPES, type PlatformMessageAudience, type PlatformMessageType } from '../../messaging/model';
import type {
  PlatformMessageAudiencePreview,
  PlatformMessageGroupTarget,
  PlatformMessageHistoryItem,
  PlatformMessageHistoryPage,
  PlatformMessageSendInput,
  PlatformMessageUserTarget,
} from './model';

export interface PlatformMessagingService {
  searchUsers(query: string): Promise<PlatformMessageUserTarget[]>;
  searchGroups(query: string): Promise<PlatformMessageGroupTarget[]>;
  preview(audience: PlatformMessageAudience, targetId: string | null, type: PlatformMessageType): Promise<PlatformMessageAudiencePreview>;
  send(input: PlatformMessageSendInput): Promise<string>;
  list(): Promise<PlatformMessageHistoryPage>;
  edit(messageId: string, subject: string, body: string, expiresAt: string | null, reason: string): Promise<void>;
  withdraw(messageId: string, reason: string): Promise<void>;
}

const audiences = new Set<string>(PLATFORM_MESSAGE_AUDIENCES);
const types = new Set<string>(PLATFORM_MESSAGE_TYPES);
const statuses = new Set<string>(['ACTIVE', 'SUSPENDED', 'DELETION_PENDING']);
const messageStatuses = new Set<string>(['SENT', 'WITHDRAWN']);

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}
function count(value: number | string, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}.`);
  return parsed;
}
function date(value: string | null, label: string): string | null {
  if (value === null) return null;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}.`);
  return value;
}
function single<T>(data: unknown, label: string): T {
  const row = (data as T[] | null)?.[0];
  if (!row) throw new Error(`${label} did not return a result.`);
  return row;
}

type PreviewRow = { preview_id: string; audience_type: string; audience_label: string; recipient_count: number; confirmation_phrase: string; expires_at: string };
type HistoryRow = {
  message_id: string; audience_type: string; audience_label: string; message_type: string; subject: string; body: string;
  acknowledgement_required: boolean; expires_at: string | null; status: string; current_revision: number; recipient_count: number;
  read_count: number; acknowledged_count: number; sent_at: string; edited_at: string | null; withdrawn_at: string | null; total_count: number | string;
};

function mapPreview(row: PreviewRow): PlatformMessageAudiencePreview {
  if (!row.preview_id || !row.audience_label || !row.confirmation_phrase || !audiences.has(row.audience_type)) throw new Error('Invalid audience preview.');
  return { previewId: row.preview_id, audienceType: row.audience_type as PlatformMessageAudience, audienceLabel: row.audience_label, recipientCount: count(row.recipient_count, 'recipient count'), confirmationPhrase: row.confirmation_phrase, expiresAt: date(row.expires_at, 'preview expiry')! };
}

function mapHistory(row: HistoryRow): PlatformMessageHistoryItem {
  if (!row.message_id || !row.audience_label || !row.subject || !row.body || !audiences.has(row.audience_type) || !types.has(row.message_type) || !messageStatuses.has(row.status)) throw new Error('Invalid platform message history.');
  return {
    messageId: row.message_id, audienceType: row.audience_type as PlatformMessageAudience, audienceLabel: row.audience_label,
    messageType: row.message_type as PlatformMessageType, subject: row.subject, body: row.body,
    acknowledgementRequired: row.acknowledgement_required, expiresAt: date(row.expires_at, 'message expiry'), status: row.status as 'SENT' | 'WITHDRAWN',
    currentRevision: count(row.current_revision, 'message revision'), recipientCount: count(row.recipient_count, 'recipient count'),
    readCount: count(row.read_count, 'read count'), acknowledgedCount: count(row.acknowledged_count, 'acknowledgement count'),
    sentAt: date(row.sent_at, 'message send date')!, editedAt: date(row.edited_at, 'message edit date'), withdrawnAt: date(row.withdrawn_at, 'message withdrawal date'),
  };
}

export function createPlatformMessagingService(client: SupabaseClient = getSupabaseClient()): PlatformMessagingService {
  return {
    async searchUsers(query) {
      const { data, error } = await client.rpc('search_platform_message_users', { p_query: query.trim() || null, p_limit: 20 });
      if (error) throw error;
      return ((data ?? []) as Array<{ user_id: string; username: string; display_name: string; account_status: string }>).map((row) => {
        if (!row.user_id || !row.username || !row.display_name || !statuses.has(row.account_status)) throw new Error('Invalid message user target.');
        return { userId: row.user_id, username: row.username, displayName: row.display_name, accountStatus: row.account_status as PlatformMessageUserTarget['accountStatus'] };
      });
    },
    async searchGroups(query) {
      const { data, error } = await client.rpc('search_platform_message_groups', { p_query: query.trim() || null, p_limit: 20 });
      if (error) throw error;
      return ((data ?? []) as Array<{ group_id: string; group_name: string; eligible_recipient_count: number }>).map((row) => {
        if (!row.group_id || !row.group_name) throw new Error('Invalid message group target.');
        return { groupId: row.group_id, groupName: row.group_name, eligibleRecipientCount: count(row.eligible_recipient_count, 'eligible group recipient count') };
      });
    },
    async preview(audience, targetId, type) {
      const { data, error } = await client.rpc('preview_platform_message_audience', {
        p_audience_type: audience,
        p_target_user_id: audience === 'USER' ? required(targetId ?? '', 'User target') : null,
        p_target_group_id: audience === 'GROUP' ? required(targetId ?? '', 'Group target') : null,
        p_message_type: audience === 'ALL' ? 'NOTICE' : type,
      });
      if (error) throw error;
      return mapPreview(single<PreviewRow>(data, 'Audience preview'));
    },
    async send(input) {
      const { data, error } = await client.rpc('send_platform_message', {
        p_preview_id: required(input.previewId, 'Audience preview'), p_subject: required(input.subject, 'Subject'), p_body: required(input.body, 'Message body'),
        p_acknowledgement_required: input.acknowledgementRequired, p_expires_at: input.expiresAt,
        p_confirmation: input.confirmation, p_audit_reason: required(input.auditReason, 'Audit reason'),
      });
      if (error) throw error;
      return single<{ message_id: string }>(data, 'Message send').message_id;
    },
    async list() {
      const { data, error } = await client.rpc('list_platform_messages', { p_page: 1, p_page_size: 50 });
      if (error) throw error;
      const rows = (data ?? []) as HistoryRow[];
      return { items: rows.map(mapHistory), total: rows.length ? count(rows[0].total_count, 'message total') : 0 };
    },
    async edit(messageId, subject, body, expiresAt, reason) {
      const { error } = await client.rpc('edit_platform_message', { p_message_id: required(messageId, 'Message ID'), p_subject: required(subject, 'Subject'), p_body: required(body, 'Message body'), p_expires_at: expiresAt, p_reason: required(reason, 'Edit reason') });
      if (error) throw error;
    },
    async withdraw(messageId, reason) {
      const { error } = await client.rpc('withdraw_platform_message', { p_message_id: required(messageId, 'Message ID'), p_reason: required(reason, 'Withdrawal reason') });
      if (error) throw error;
    },
  };
}
