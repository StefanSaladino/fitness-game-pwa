import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  USER_REPORT_CATEGORIES,
  type SubmitUserReportInput,
  type UserReportReceipt,
} from './model';

const categories = new Set<string>(USER_REPORT_CATEGORIES);

export interface UserReportService {
  submit(input: SubmitUserReportInput): Promise<UserReportReceipt>;
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function createUserReportService(
  client: SupabaseClient = getSupabaseClient(),
): UserReportService {
  return {
    async submit(input) {
      const targetUserId = required(input.targetUserId, 'Target user ID');
      if (!categories.has(input.category)) throw new Error('Report category is invalid.');

      const reason = input.reason.trim();
      if (reason.length < 10 || reason.length > 2000) {
        throw new Error('Report reason must be between 10 and 2000 characters.');
      }

      const reference = input.reference ?? null;
      const referenceGroupId = reference ? required(reference.groupId, 'Reference group ID') : null;
      const referenceId = reference?.type === 'WORKOUT'
        ? required(reference.workoutId, 'Workout ID')
        : reference?.type === 'SOCIAL_ACTIVITY'
          ? required(reference.activityKey, 'Activity key')
          : null;

      const { data, error } = await client.rpc('submit_user_report', {
        p_target_user_id: targetUserId,
        p_category: input.category,
        p_reason: reason,
        p_reference_type: reference?.type ?? null,
        p_reference_group_id: referenceGroupId,
        p_reference_id: referenceId,
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data.trim()) throw new Error('Report receipt is invalid.');

      return { caseId: data };
    },
  };
}
