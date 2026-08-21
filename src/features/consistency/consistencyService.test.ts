import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createLiftingConsistencyService } from './consistencyService';

function fakeClient(): SupabaseClient {
  return {
    rpc(name: string) {
      expect(name).toBe('get_my_lifting_consistency_summary');
      return Promise.resolve({
        data: [{
          current_week_start: '2026-08-17',
          current_week_target: 4,
          current_week_lifting_days: 2,
          current_completed_week_streak: 3,
          best_completed_week_streak: 4,
          completed_weeks: 6,
          goals_hit: 5,
          recent_weeks: [{ weekStart: '2026-08-10', target: 4, liftingDays: 4, achieved: true }],
          badges: [{ badgeKey: 'GOAL_STREAK_4', earnedAt: '2026-08-17T04:00:00Z' }],
        }],
        error: null,
      });
    },
  } as unknown as SupabaseClient;
}

describe('lifting consistency service', () => {
  it('maps the guarded weekly consistency RPC into the client read model', async () => {
    const summary = await createLiftingConsistencyService(fakeClient()).load();
    expect(summary).toMatchObject({ currentWeekTarget: 4, currentCompletedWeekStreak: 3, bestCompletedWeekStreak: 4, goalsHit: 5 });
    expect(summary.recentWeeks[0]).toEqual({ weekStart: '2026-08-10', target: 4, liftingDays: 4, achieved: true });
    expect(summary.badges[0]?.badgeKey).toBe('GOAL_STREAK_4');
  });
});
