import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import type {
  PlatformAccountDetail,
  PlatformAccountDirectoryPage,
  PlatformAccountDirectoryQuery,
  PlatformAccountStatus,
  PlatformAccountSummary,
} from './model';

const ACCOUNT_STATUSES = new Set<PlatformAccountStatus>(['ACTIVE', 'SUSPENDED', 'DELETION_PENDING']);

type DirectoryRow = {
  user_id: string;
  username: string;
  display_name: string;
  account_status: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_platform_admin: boolean;
  suspension_review_at: string | null;
  deletion_requested_at: string | null;
  total_count: number | string;
};

type DetailRow = Omit<DirectoryRow, 'total_count'> & {
  status_reason: string | null;
  status_updated_at: string;
  deletion_requested_by: string | null;
};

export interface PlatformAccountAdminService {
  list(query?: PlatformAccountDirectoryQuery): Promise<PlatformAccountDirectoryPage>;
  get(userId: string): Promise<PlatformAccountDetail>;
  suspend(userId: string, reason: string, reviewAt?: string | null): Promise<void>;
  restore(userId: string, reason: string): Promise<void>;
  requestDeletion(userId: string, reason: string): Promise<void>;
  cancelDeletion(userId: string, reason: string): Promise<void>;
  confirmDeletion(userId: string, confirmation: string): Promise<void>;
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function optionalIsoDate(value: string | null): string | null {
  if (value === null) return null;
  if (!isIsoDate(value)) throw new Error('Invalid platform account date.');
  return value;
}

function accountStatus(value: string): PlatformAccountStatus {
  if (!ACCOUNT_STATUSES.has(value as PlatformAccountStatus)) {
    throw new Error('Invalid platform account status.');
  }
  return value as PlatformAccountStatus;
}

function summary(row: Omit<DirectoryRow, 'total_count'>): PlatformAccountSummary {
  if (!row.user_id || !row.username || !row.display_name || !isIsoDate(row.created_at)) {
    throw new Error('Invalid platform account row.');
  }

  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    accountStatus: accountStatus(row.account_status),
    createdAt: row.created_at,
    lastSignInAt: optionalIsoDate(row.last_sign_in_at),
    isPlatformAdmin: Boolean(row.is_platform_admin),
    suspensionReviewAt: optionalIsoDate(row.suspension_review_at),
    deletionRequestedAt: optionalIsoDate(row.deletion_requested_at),
  };
}

function positiveInteger(value: number | string, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function nonEmptyUserId(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) throw new Error('User ID is required.');
  return normalized;
}

export function createPlatformAccountAdminService(
  client: SupabaseClient = getSupabaseClient(),
): PlatformAccountAdminService {
  return {
    async list(query = {}) {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;
      const { data, error } = await client.rpc('list_platform_accounts', {
        p_query: query.query?.trim() || null,
        p_status: query.status ?? null,
        p_page: page,
        p_page_size: pageSize,
      });
      if (error) throw error;

      const rows = (data ?? []) as DirectoryRow[];
      const total = rows.length > 0 ? positiveInteger(rows[0].total_count, 'platform account total') : 0;
      return {
        items: rows.map(({ total_count: _total, ...row }) => summary(row)),
        total,
        page,
        pageSize,
      };
    },

    async get(userId) {
      const { data, error } = await client.rpc('get_platform_account_detail', {
        p_target_user_id: nonEmptyUserId(userId),
      });
      if (error) throw error;

      const row = ((data ?? []) as DetailRow[])[0];
      if (!row || !isIsoDate(row.status_updated_at)) throw new Error('Platform account not found.');

      return {
        ...summary(row),
        statusReason: row.status_reason,
        statusUpdatedAt: row.status_updated_at,
        deletionRequestedBy: row.deletion_requested_by,
      };
    },

    async suspend(userId, reason, reviewAt = null) {
      const { error } = await client.functions.invoke('platform-account-auth', {
        body: {
          action: 'SUSPEND',
          userId: nonEmptyUserId(userId),
          reason,
          reviewAt,
        },
      });
      if (error) throw error;
    },

    async restore(userId, reason) {
      const { error } = await client.functions.invoke('platform-account-auth', {
        body: {
          action: 'RESTORE',
          userId: nonEmptyUserId(userId),
          reason,
        },
      });
      if (error) throw error;
    },

    async requestDeletion(userId, reason) {
      const { error } = await client.rpc('request_platform_account_deletion', {
        p_target_user_id: nonEmptyUserId(userId),
        p_reason: reason,
      });
      if (error) throw error;
    },

    async cancelDeletion(userId, reason) {
      const { error } = await client.rpc('cancel_platform_account_deletion', {
        p_target_user_id: nonEmptyUserId(userId),
        p_reason: reason,
      });
      if (error) throw error;
    },

    async confirmDeletion(userId, confirmation) {
      const { error } = await client.functions.invoke('platform-account-auth', {
        body: {
          action: 'DELETE_ADMIN',
          userId: nonEmptyUserId(userId),
          confirmation,
        },
      });
      if (error) throw error;
    },
  };
}
