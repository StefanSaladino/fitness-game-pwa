import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createExerciseProgressService } from './progressService';

function fakeClient(): SupabaseClient {
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'get_my_exercise_progress_overview') {
      return {
        data: [{
          exercise_id: 'bench', canonical_name: 'Bench Press', measurement_type: 'WEIGHT_REPS', metric_type: 'E1RM',
          best_value: '122.5', best_weight_kg: '105', best_reps: 5, achieved_at: '2026-08-12T14:30:00Z', previous_pr_value: '116.6667',
          session_count: 3, observation_count: '3', first_performed_at: '2026-08-10T14:30:00Z', last_performed_at: '2026-08-17T14:30:00Z',
          average_days_between_sessions: '3.50', latest_metric_value: '116.6667', latest_weight_kg: '100', latest_reps: 5, latest_observed_at: '2026-08-17T14:30:00Z',
        }],
        error: null,
      };
    }
    if (name === 'get_my_lifting_calendar_summaries') {
      expect(args).toEqual({ p_week_count: 12, p_month_count: 6 });
      return {
        data: [{
          period_kind: 'WEEK', period_start: '2026-08-17', period_end: '2026-08-23',
          completed_lifting_sessions: '3', exercise_count: 7, completed_working_sets: '31',
          volume_kg_reps: '13950', pr_count: '2',
        }],
        error: null,
      };
    }
    if (name === 'get_my_exercise_progress_history') {
      expect(args).toEqual({ p_exercise_id: 'bench' });
      return {
        data: [{
          workout_id: 'lift-1', scoring_date: '2026-08-12', observed_at: '2026-08-12T14:30:00Z', metric_type: 'E1RM', metric_value: '122.5',
          weight_kg: '105', reps: 5, previous_pr_value: '116.6667', is_baseline: false, is_pr: true, is_current_pr: true,
          completed_working_sets: 4, session_volume_kg_reps: '2100', heaviest_weight_kg: '105', max_completed_reps: 5,
          plain_bodyweight_sets: 0, added_weight_sets: 0, assisted_sets: 0,
        }],
        error: null,
      };
    }
    return { data: [], error: null };
  });
  return { rpc } as unknown as SupabaseClient;
}

describe('exercise progress service', () => {
  it('maps authenticated progress read models into client-safe numbers', async () => {
    const service = createExerciseProgressService(fakeClient());
    const overview = await service.listOverview();
    const calendar = await service.loadCalendarSummaries();
    const history = await service.loadHistory('bench');

    expect(overview[0]).toMatchObject({
      exerciseId: 'bench', canonicalName: 'Bench Press', metricType: 'E1RM', bestValue: 122.5,
      bestWeightKg: 105, sessionCount: 3, observationCount: 3, averageDaysBetweenSessions: 3.5,
      latestMetricValue: 116.6667,
    });
    expect(calendar[0]).toEqual({
      periodKind: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23', completedLiftingSessions: 3,
      exerciseCount: 7, completedWorkingSets: 31, volumeKgReps: 13950, prCount: 2,
    });
    expect(history[0]).toMatchObject({
      workoutId: 'lift-1', metricValue: 122.5, previousPrValue: 116.6667,
      isPr: true, isCurrentPr: true, sessionVolumeKgReps: 2100,
    });
  });
});
