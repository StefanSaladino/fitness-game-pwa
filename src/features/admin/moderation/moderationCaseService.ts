import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  USER_REPORT_CATEGORIES,
  type UserReportCategory,
  type UserReportReferenceType,
} from '../../moderation/model';
import {
  MODERATION_CASE_ACTIONS,
  MODERATION_ACTIVITY_TYPES,
  MODERATION_CASE_STATUSES,
  type BeginModerationActivityReviewInput,
  type ModerationActivityItem,
  type ModerationActivityPage,
  type ModerationActivityReviewAccess,
  type ModerationActivityType,
  type ModerationCaseAction,
  type ModerationCaseDetail,
  type ModerationCaseDirectoryPage,
  type ModerationCaseDirectoryQuery,
  type ModerationCaseEvent,
  type ModerationCaseNote,
  type ModerationCaseRecord,
  type ModerationCaseStatus,
  type ModerationCaseSummary,
} from './model';

const statuses = new Set<string>(MODERATION_CASE_STATUSES);
const actions = new Set<string>(MODERATION_CASE_ACTIONS);
const activityTypes = new Set<string>(MODERATION_ACTIVITY_TYPES);
const categories = new Set<string>(USER_REPORT_CATEGORIES);
const referenceTypes = new Set<string>(['GROUP', 'WORKOUT', 'SOCIAL_ACTIVITY']);

type SummaryRow = {
  case_id: string;
  report_id: string;
  status: string;
  category: string;
  reason_excerpt: string;
  reporter_user_id: string;
  reporter_username: string;
  reporter_display_name: string;
  target_user_id: string;
  target_username: string;
  target_display_name: string;
  reference_type: string | null;
  reference_label: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  total_count: number | string;
};

type DetailRow = Omit<SummaryRow, 'reason_excerpt' | 'total_count'> & {
  reason: string;
  reference_group_id: string | null;
  reference_id: string | null;
  assigned_at: string | null;
  resolution_reason: string | null;
  retention_until: string | null;
};

type NoteRow = {
  note_id: string;
  author_user_id: string;
  author_username: string;
  author_display_name: string;
  body: string;
  created_at: string;
};

type EventRow = {
  event_id: string;
  actor_user_id: string;
  actor_username: string;
  actor_display_name: string;
  action: string;
  reason: string | null;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

type ActivityAccessRow = {
  access_id: string;
  target_user_id: string;
  target_username: string;
  target_display_name: string;
  account_status: string | null;
  case_id: string | null;
  activity_types: string[];
  granted_at: string;
  expires_at: string;
};

type ActivityRow = {
  activity_type: string;
  activity_key: string;
  title: string;
  detail: string;
  occurred_at: string;
  source_case_id: string | null;
  metadata: unknown;
  has_more: boolean;
};

export interface ModerationCaseService {
  list(query?: ModerationCaseDirectoryQuery): Promise<ModerationCaseDirectoryPage>;
  get(caseId: string): Promise<ModerationCaseRecord>;
  assign(caseId: string, assigneeUserId: string | null, reason: string): Promise<void>;
  addNote(caseId: string, note: string): Promise<string>;
  updateStatus(caseId: string, status: Exclude<ModerationCaseStatus, 'NEW'>, reason: string): Promise<void>;
  beginActivityReview(input: BeginModerationActivityReviewInput): Promise<ModerationActivityReviewAccess>;
  listActivity(
    accessId: string,
    cursor?: { occurredAt: string; activityKey: string } | null,
    pageSize?: number,
  ): Promise<ModerationActivityPage>;
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function isoDate(value: string, label: string): string {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}.`);
  return value;
}

function optionalIsoDate(value: string | null, label: string): string | null {
  return value === null ? null : isoDate(value, label);
}

function status(value: string): ModerationCaseStatus {
  if (!statuses.has(value)) throw new Error('Invalid moderation case status.');
  return value as ModerationCaseStatus;
}

function category(value: string): UserReportCategory {
  if (!categories.has(value)) throw new Error('Invalid user report category.');
  return value as UserReportCategory;
}

function referenceType(value: string | null): UserReportReferenceType | null {
  if (value === null) return null;
  if (!referenceTypes.has(value)) throw new Error('Invalid report reference type.');
  return value as UserReportReferenceType;
}

function party(userId: string, username: string, displayName: string) {
  if (!userId || !username || !displayName) throw new Error('Invalid moderation case identity.');
  return { userId, username, displayName };
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function count(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('Invalid moderation case total.');
  return parsed;
}

function activityType(value: string): ModerationActivityType {
  if (!activityTypes.has(value)) throw new Error('Invalid moderation activity type.');
  return value as ModerationActivityType;
}

function activityAccess(row: ActivityAccessRow): ModerationActivityReviewAccess {
  const validStatuses = new Set(['ACTIVE', 'SUSPENDED', 'DELETION_PENDING']);
  if (!row.access_id || !Array.isArray(row.activity_types) || row.activity_types.length === 0) {
    throw new Error('Invalid moderation activity access.');
  }
  if (row.account_status !== null && !validStatuses.has(row.account_status)) {
    throw new Error('Invalid moderation review account status.');
  }
  return {
    accessId: row.access_id,
    target: party(row.target_user_id, row.target_username, row.target_display_name),
    accountStatus: row.account_status as ModerationActivityReviewAccess['accountStatus'],
    caseId: row.case_id,
    activityTypes: row.activity_types.map(activityType),
    grantedAt: isoDate(row.granted_at, 'moderation activity grant date'),
    expiresAt: isoDate(row.expires_at, 'moderation activity expiry date'),
  };
}

function activity(row: ActivityRow): ModerationActivityItem {
  if (!row.activity_key || !row.title || !row.detail || typeof row.has_more !== 'boolean') {
    throw new Error('Invalid moderation activity row.');
  }
  return {
    activityType: activityType(row.activity_type),
    activityKey: row.activity_key,
    title: row.title,
    detail: row.detail,
    occurredAt: isoDate(row.occurred_at, 'moderation activity date'),
    sourceCaseId: row.source_case_id,
    metadata: plainObject(row.metadata, 'moderation activity metadata'),
  };
}

function summary(row: Omit<SummaryRow, 'total_count'>): ModerationCaseSummary {
  if (!row.case_id || !row.report_id || !row.reason_excerpt) {
    throw new Error('Invalid moderation case row.');
  }
  return {
    caseId: row.case_id,
    reportId: row.report_id,
    status: status(row.status),
    category: category(row.category),
    reasonExcerpt: row.reason_excerpt,
    reporter: party(row.reporter_user_id, row.reporter_username, row.reporter_display_name),
    target: party(row.target_user_id, row.target_username, row.target_display_name),
    referenceType: referenceType(row.reference_type),
    referenceLabel: row.reference_label,
    assignedTo: row.assigned_to,
    createdAt: isoDate(row.created_at, 'moderation case creation date'),
    updatedAt: isoDate(row.updated_at, 'moderation case update date'),
    closedAt: optionalIsoDate(row.closed_at, 'moderation case closure date'),
  };
}

function detail(row: DetailRow): ModerationCaseDetail {
  const base = summary({ ...row, reason_excerpt: row.reason });
  const { reasonExcerpt: _reasonExcerpt, ...shared } = base;
  return {
    ...shared,
    reason: row.reason,
    referenceGroupId: row.reference_group_id,
    referenceId: row.reference_id,
    assignedAt: optionalIsoDate(row.assigned_at, 'moderation case assignment date'),
    resolutionReason: row.resolution_reason,
    retentionUntil: optionalIsoDate(row.retention_until, 'moderation case retention date'),
  };
}

function note(row: NoteRow): ModerationCaseNote {
  if (!row.note_id || !row.body) throw new Error('Invalid moderator note.');
  return {
    noteId: row.note_id,
    author: party(row.author_user_id, row.author_username, row.author_display_name),
    body: row.body,
    createdAt: isoDate(row.created_at, 'moderator note date'),
  };
}

function event(row: EventRow): ModerationCaseEvent {
  if (!row.event_id || !actions.has(row.action)) throw new Error('Invalid moderation case event.');
  return {
    eventId: row.event_id,
    actor: party(row.actor_user_id, row.actor_username, row.actor_display_name),
    action: row.action as ModerationCaseAction,
    reason: row.reason,
    beforeState: plainObject(row.before_state, 'moderation event before state'),
    afterState: plainObject(row.after_state, 'moderation event after state'),
    createdAt: isoDate(row.created_at, 'moderation event date'),
  };
}

export function createModerationCaseService(
  client: SupabaseClient = getSupabaseClient(),
): ModerationCaseService {
  return {
    async list(query = {}) {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;
      const { data, error } = await client.rpc('list_moderation_cases', {
        p_status: query.status ?? null,
        p_assigned_to: query.assignedTo?.trim() || null,
        p_page: page,
        p_page_size: pageSize,
      });
      if (error) throw error;

      const rows = (data ?? []) as SummaryRow[];
      return {
        items: rows.map(({ total_count: _total, ...row }) => summary(row)),
        total: rows.length > 0 ? count(rows[0].total_count) : 0,
        page,
        pageSize,
      };
    },

    async get(caseId) {
      const normalizedCaseId = required(caseId, 'Moderation case ID');
      const detailResult = await client.rpc('get_moderation_case_detail', { p_case_id: normalizedCaseId });
      if (detailResult.error) throw detailResult.error;

      const detailRow = ((detailResult.data ?? []) as DetailRow[])[0];
      if (!detailRow) throw new Error('Moderation case not found.');

      const [notesResult, eventsResult] = await Promise.all([
        client.rpc('list_moderation_case_notes', { p_case_id: normalizedCaseId }),
        client.rpc('list_moderation_case_events', { p_case_id: normalizedCaseId }),
      ]);
      if (notesResult.error) throw notesResult.error;
      if (eventsResult.error) throw eventsResult.error;

      return {
        detail: detail(detailRow),
        notes: ((notesResult.data ?? []) as NoteRow[]).map(note),
        events: ((eventsResult.data ?? []) as EventRow[]).map(event),
      };
    },

    async assign(caseId, assigneeUserId, reason) {
      const { error } = await client.rpc('assign_moderation_case', {
        p_case_id: required(caseId, 'Moderation case ID'),
        p_assignee_user_id: assigneeUserId?.trim() || null,
        p_reason: required(reason, 'Assignment reason'),
      });
      if (error) throw error;
    },

    async addNote(caseId, body) {
      const { data, error } = await client.rpc('add_moderation_case_note', {
        p_case_id: required(caseId, 'Moderation case ID'),
        p_note: required(body, 'Moderator note'),
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data.trim()) throw new Error('Moderator note receipt is invalid.');
      return data;
    },

    async updateStatus(caseId, nextStatus, reason) {
      if (!statuses.has(nextStatus)) {
        throw new Error('Moderation case can only advance from NEW.');
      }
      const { error } = await client.rpc('update_moderation_case_status', {
        p_case_id: required(caseId, 'Moderation case ID'),
        p_status: nextStatus,
        p_reason: required(reason, 'Status reason'),
      });
      if (error) throw error;
    },

    async beginActivityReview(input) {
      const accessReason = required(input.accessReason, 'Activity access reason');
      if (accessReason.length > 500) throw new Error('Activity access reason must be between 3 and 500 characters.');
      if (accessReason.length < 3) throw new Error('Activity access reason must be between 3 and 500 characters.');
      const requestedTypes = input.activityTypes ?? [...MODERATION_ACTIVITY_TYPES];
      if (requestedTypes.length < 1 || requestedTypes.length > MODERATION_ACTIVITY_TYPES.length) {
        throw new Error('Choose at least one moderation activity type.');
      }
      const normalizedTypes = [...new Set(requestedTypes.map(activityType))];

      const { data, error } = await client.rpc('begin_moderation_activity_review', {
        p_target_user_id: required(input.targetUserId, 'Moderation review subject'),
        p_access_reason: accessReason,
        p_case_id: input.caseId?.trim() || null,
        p_activity_types: normalizedTypes,
      });
      if (error) throw error;
      const row = ((data ?? []) as ActivityAccessRow[])[0];
      if (!row) throw new Error('Moderation activity access was not granted.');
      return activityAccess(row);
    },

    async listActivity(accessId, cursor = null, pageSize = 25) {
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
        throw new Error('Activity page size must be between 1 and 50.');
      }
      const { data, error } = await client.rpc('list_moderation_activity_review', {
        p_access_id: required(accessId, 'Moderation activity access'),
        p_before_occurred_at: cursor ? isoDate(cursor.occurredAt, 'activity cursor date') : null,
        p_before_activity_key: cursor ? required(cursor.activityKey, 'Activity cursor key') : null,
        p_page_size: pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as ActivityRow[];
      const items = rows.map(activity);
      const last = items.at(-1);
      return {
        items,
        nextCursor: rows[0]?.has_more && last
          ? { occurredAt: last.occurredAt, activityKey: last.activityKey }
          : null,
      };
    },
  };
}
