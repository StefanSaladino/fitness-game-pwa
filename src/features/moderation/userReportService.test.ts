import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createUserReportService } from './userReportService';

const CASE_ID = '153e0000-0000-4000-8000-000000000001';

function clientWithRpc(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient;
}

describe('user report service', () => {
  it('submits a private report without an evidence reference', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: CASE_ID, error: null });
    const service = createUserReportService(clientWithRpc(rpc));

    await expect(service.submit({
      targetUserId: 'target-user-id',
      category: 'HARASSMENT',
      reason: ' Repeated unwanted contact in our group. ',
    })).resolves.toEqual({ caseId: CASE_ID });

    expect(rpc).toHaveBeenCalledWith('submit_user_report', {
      p_target_user_id: 'target-user-id',
      p_category: 'HARASSMENT',
      p_reason: 'Repeated unwanted contact in our group.',
      p_reference_type: null,
      p_reference_group_id: null,
      p_reference_id: null,
    });
  });

  it('maps current group, workout, and social-activity evidence contracts', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: CASE_ID, error: null });
    const service = createUserReportService(clientWithRpc(rpc));

    await service.submit({
      targetUserId: 'target',
      category: 'SPAM',
      reason: 'Group context for this report.',
      reference: { type: 'GROUP', groupId: 'group' },
    });
    await service.submit({
      targetUserId: 'target',
      category: 'CHEATING',
      reason: 'Workout context for this report.',
      reference: { type: 'WORKOUT', groupId: 'group', workoutId: 'workout' },
    });
    await service.submit({
      targetUserId: 'target',
      category: 'ABUSIVE_CONTENT',
      reason: 'Activity context for this report.',
      reference: { type: 'SOCIAL_ACTIVITY', groupId: 'group', activityKey: 'LIFT:key' },
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'submit_user_report', expect.objectContaining({
      p_reference_type: 'GROUP',
      p_reference_group_id: 'group',
      p_reference_id: null,
    }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'submit_user_report', expect.objectContaining({
      p_reference_type: 'WORKOUT',
      p_reference_id: 'workout',
    }));
    expect(rpc).toHaveBeenNthCalledWith(3, 'submit_user_report', expect.objectContaining({
      p_reference_type: 'SOCIAL_ACTIVITY',
      p_reference_id: 'LIFT:key',
    }));
  });

  it('rejects incomplete client input before invoking the server', async () => {
    const rpc = vi.fn();
    const service = createUserReportService(clientWithRpc(rpc));

    await expect(service.submit({
      targetUserId: 'target',
      category: 'OTHER',
      reason: 'too short',
    })).rejects.toThrow('Report reason must be between 10 and 2000 characters.');

    await expect(service.submit({
      targetUserId: 'target',
      category: 'SAFETY',
      reason: 'A sufficiently detailed safety report.',
      reference: { type: 'WORKOUT', groupId: 'group', workoutId: ' ' },
    })).rejects.toThrow('Workout ID is required.');

    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the server does not return a durable case receipt', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createUserReportService(clientWithRpc(rpc));

    await expect(service.submit({
      targetUserId: 'target',
      category: 'OTHER',
      reason: 'A sufficiently detailed report reason.',
    })).rejects.toThrow('Report receipt is invalid.');
  });
});
