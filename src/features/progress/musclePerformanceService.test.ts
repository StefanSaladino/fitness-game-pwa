import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createMusclePerformanceService } from './musclePerformanceService';

function fakeClient(): SupabaseClient {
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    expect(name).toBe('get_my_muscle_performance_observations');
    expect(args).toEqual({
      p_lookback_days: 56,
      p_anchor_date: '2026-09-19',
    });

    return {
      data: [{
        muscle_group: 'CHEST',
        exercise_id: 'bench',
        canonical_name: 'Barbell Bench Press',
        contribution_role: 'DIRECT',
        contribution_weight: '1',
        scoring_date: '2026-09-15',
        observed_at: '2026-09-15T13:00:00Z',
        metric_type: 'E1RM',
        metric_value: '110',
        reference_metric_value: '100',
        relative_performance_index: '1.1',
      }],
      error: null,
    };
  });

  return { rpc } as unknown as SupabaseClient;
}

describe('muscle performance service', () => {
  it('maps the authenticated performance read model into normalized client observations', async () => {
    const service = createMusclePerformanceService(fakeClient());
    const rows = await service.loadObservations('2026-09-19');

    expect(rows).toEqual([{
      muscleGroup: 'CHEST',
      exerciseId: 'bench',
      canonicalName: 'Barbell Bench Press',
      contributionRole: 'DIRECT',
      contributionWeight: 1,
      scoringDate: '2026-09-15',
      observedAt: '2026-09-15T13:00:00Z',
      relativePerformanceIndex: 1.1,
    }]);
  });
});
