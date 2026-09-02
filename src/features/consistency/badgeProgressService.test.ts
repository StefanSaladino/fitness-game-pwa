import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createLiftingBadgeProgressService } from './badgeProgressService';

function fakeClient(): SupabaseClient {
  return {
    rpc(name: string) {
      expect(name).toBe('get_my_lifting_badge_progress');
      return Promise.resolve({
        data: [{
          pr_count: 9,
          lifting_day_count: 24,
          goals_hit: 3,
          best_completed_week_streak: 3,
          cardio_bonus_day_count: 4,
          badges: [{ badgeKey: 'PR_5', earnedAt: '2026-08-20T04:00:00Z' }],
        }],
        error: null,
      });
    },
  } as unknown as SupabaseClient;
}

describe('lifting badge progress service', () => {
  it('maps the guarded progress RPC into persistent authoritative counters', async () => {
    const service = createLiftingBadgeProgressService(fakeClient());
    const first = await service.load();
    const second = await service.load();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      prCount: 9,
      liftingDayCount: 24,
      goalsHit: 3,
      bestCompletedWeekStreak: 3,
      cardioBonusDayCount: 4,
    });
    expect(first.badges[0]?.badgeKey).toBe('PR_5');
  });
});
