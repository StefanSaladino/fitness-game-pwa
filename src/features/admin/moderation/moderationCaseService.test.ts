import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createModerationCaseService } from './moderationCaseService';

const CASE_ID = '153e0000-0000-4000-8000-000000000001';
const REPORT_ID = '153e0000-0000-4000-8000-000000000002';
const ADMIN_ID = '153e0000-0000-4000-8000-000000000003';
const CREATED_AT = '2026-08-23T12:00:00.000Z';

const SUMMARY_ROW = {
  case_id: CASE_ID,
  report_id: REPORT_ID,
  status: 'NEW',
  category: 'HARASSMENT',
  reason_excerpt: 'Repeated unwanted contact.',
  reporter_user_id: 'reporter-id',
  reporter_username: 'reporter',
  reporter_display_name: 'Reporter User',
  target_user_id: 'target-id',
  target_username: 'target',
  target_display_name: 'Target User',
  reference_type: 'GROUP',
  reference_label: 'Training Friends',
  assigned_to: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  closed_at: null,
  total_count: '1',
};

function clientWithRpc(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient;
}

describe('moderation case service', () => {
  it('maps the private queue contract for authorized admin consumers', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [SUMMARY_ROW], error: null });
    const service = createModerationCaseService(clientWithRpc(rpc));

    await expect(service.list({ status: 'NEW', page: 2, pageSize: 10 })).resolves.toEqual({
      items: [{
        caseId: CASE_ID,
        reportId: REPORT_ID,
        status: 'NEW',
        category: 'HARASSMENT',
        reasonExcerpt: 'Repeated unwanted contact.',
        reporter: { userId: 'reporter-id', username: 'reporter', displayName: 'Reporter User' },
        target: { userId: 'target-id', username: 'target', displayName: 'Target User' },
        referenceType: 'GROUP',
        referenceLabel: 'Training Friends',
        assignedTo: null,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        closedAt: null,
      }],
      total: 1,
      page: 2,
      pageSize: 10,
    });

    expect(rpc).toHaveBeenCalledWith('list_moderation_cases', {
      p_status: 'NEW',
      p_assigned_to: null,
      p_page: 2,
      p_page_size: 10,
    });
  });

  it('loads bounded case detail, notes, and append-only history', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{
          ...SUMMARY_ROW,
          reason_excerpt: undefined,
          total_count: undefined,
          reason: 'Full private report reason.',
          reference_group_id: 'group-id',
          reference_id: null,
          assigned_at: null,
          resolution_reason: null,
          retention_until: null,
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          note_id: 'note-id',
          author_user_id: ADMIN_ID,
          author_username: 'admin',
          author_display_name: 'Admin User',
          body: 'Review target group context.',
          created_at: CREATED_AT,
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          event_id: 'event-id',
          actor_user_id: 'reporter-id',
          actor_username: 'reporter',
          actor_display_name: 'Reporter User',
          action: 'REPORT_SUBMITTED',
          reason: null,
          before_state: {},
          after_state: { status: 'NEW' },
          created_at: CREATED_AT,
        }],
        error: null,
      });
    const service = createModerationCaseService(clientWithRpc(rpc));

    const record = await service.get(CASE_ID);

    expect(record.detail.reason).toBe('Full private report reason.');
    expect(record.detail.reporter.username).toBe('reporter');
    expect(record.notes[0].body).toBe('Review target group context.');
    expect(record.events[0].action).toBe('REPORT_SUBMITTED');
  });

  it('routes assignment, notes, and status changes through guarded RPCs', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: 'note-id', error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const service = createModerationCaseService(clientWithRpc(rpc));

    await service.assign(CASE_ID, ADMIN_ID, 'Taking ownership of review');
    await expect(service.addNote(CASE_ID, 'Reviewed the group context')).resolves.toBe('note-id');
    await service.updateStatus(CASE_ID, 'IN_REVIEW', 'Initial evidence review started');

    expect(rpc).toHaveBeenNthCalledWith(1, 'assign_moderation_case', {
      p_case_id: CASE_ID,
      p_assignee_user_id: ADMIN_ID,
      p_reason: 'Taking ownership of review',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'add_moderation_case_note', {
      p_case_id: CASE_ID,
      p_note: 'Reviewed the group context',
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'update_moderation_case_status', {
      p_case_id: CASE_ID,
      p_status: 'IN_REVIEW',
      p_reason: 'Initial evidence review started',
    });
  });

  it('fails closed on malformed privileged rows', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ ...SUMMARY_ROW, status: 'UNKNOWN' }],
      error: null,
    });
    const service = createModerationCaseService(clientWithRpc(rpc));

    await expect(service.list()).rejects.toThrow('Invalid moderation case status.');
  });
});
