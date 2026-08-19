import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDashboardService } from './dashboardService';

class FakeQuery {
  private filters = new Map<string, unknown>();
  private inFilters = new Map<string, unknown[]>();
  private wantsSingle = false;
  private limited = false;

  constructor(private readonly table: string) {}
  select() { return this; }
  eq(column: string, value: unknown) { this.filters.set(column, value); return this; }
  gte() { return this; }
  lte() { return this; }
  order() { return this; }
  limit() { this.limited = true; return this; }
  in(column: string, values: unknown[]) { this.inFilters.set(column, values); return this; }
  single() { this.wantsSingle = true; return this; }

  private result() {
    if (this.table === 'weekly_goals') return { data: [{ target: 4 }], error: null };
    if (this.table === 'workout_sessions') {
      if (this.filters.get('qualifies_lifting') === true) return { data: [{ scoring_date: '2026-08-17' }, { scoring_date: '2026-08-19' }], error: null };
      if (this.limited) return { data: [{ id: 'lift-1', subtype: 'Upper Push', scoring_date: '2026-08-19', started_at: '2026-08-19T21:00:00.000Z', active_duration_seconds: 3600 }], error: null };
    }
    if (this.table === 'scoring_events') {
      if (this.inFilters.has('workout_id')) return { data: [{ event_type: 'LIFTING_WORKOUT', amount: 50, workout_id: 'lift-1' }], error: null };
      return { data: [
        { event_type: 'LIFTING_WORKOUT', amount: 50, workout_id: 'lift-1' },
        { event_type: 'EXERCISE_COMPLETE', amount: 20, workout_id: 'lift-1' },
        { event_type: 'EXERCISE_PROGRESS', amount: 10, workout_id: 'lift-1' },
        { event_type: 'CARDIO_BONUS', amount: 5, workout_id: null },
      ], error: null };
    }
    if (this.table === 'exercise_progress') return { data: [{ exercise_id: 'bench', metric_type: 'E1RM', best_value: '111', best_weight_kg: '90', best_reps: 7, achieved_at: '2026-08-19T22:00:00.000Z' }], error: null };
    if (this.table === 'profiles') return { data: this.wantsSingle ? { profile_picture_path: 'user-1/pfp.webp' } : [], error: null };
    if (this.table === 'workout_exercises') return { data: [{ workout_id: 'lift-1', exercise_id: 'bench' }, { workout_id: 'lift-1', exercise_id: 'press' }], error: null };
    if (this.table === 'exercise_catalog') return { data: [{ id: 'bench', canonical_name: 'Bench Press' }], error: null };
    return { data: [], error: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }
}

function fakeClient(): SupabaseClient {
  const client = {
    from(table: string) { return new FakeQuery(table); },
    rpc() {
      return Promise.resolve({
        data: [
          { member_user_id: 'user-2', username: 'alex', display_name: 'Alex', profile_picture_path: null, xp: 100 },
          { member_user_id: 'user-1', username: 'stefan', display_name: 'Stefan', profile_picture_path: 'user-1/pfp.webp', xp: 85 },
        ],
        error: null,
      });
    },
    storage: {
      from() {
        return { getPublicUrl(path: string) { return { data: { publicUrl: `https://storage.test/${path}` } }; } };
      },
    },
  };
  return client as unknown as SupabaseClient;
}

describe('dashboard service', () => {
  it('aggregates persisted lifting data into a dashboard read model', async () => {
    const service = createDashboardService(fakeClient());
    const result = await service.load({ userId: 'user-1', timezone: 'America/Toronto', weeklyTarget: 4, groupId: 'group-1' }, new Date('2026-08-19T22:00:00.000Z'));

    expect(result.weekStart).toBe('2026-08-17');
    expect(result.completedLiftingDays).toBe(2);
    expect(result.weeklyXp).toBe(85);
    expect(result.xpBreakdown).toEqual({ workout: 50, exercises: 20, progression: 10, cardio: 5 });
    expect(result.recentLifts[0]).toMatchObject({ title: 'Upper Push', exerciseCount: 2, xp: 50 });
    expect(result.recentPrs[0]).toMatchObject({ exerciseName: 'Bench Press', bestValue: 111 });
    expect(result.leaderboard[1]).toMatchObject({ rank: 2, isCurrentUser: true, xp: 85 });
    expect(result.currentUserProfilePictureUrl).toContain('user-1/pfp.webp');
  });
});
