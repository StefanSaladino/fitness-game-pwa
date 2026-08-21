import { describe, expect, it, vi } from 'vitest';
import { createGroupSocialService } from './socialService';

function createClient() {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'get_group_competition_leaderboard') {
      return {
        data: [{
          rank: '1', member_user_id: 'user-1', username: 'stefan', display_name: 'Stefan',
          profile_picture_path: 'user-1/profile.webp', xp: '175', lifting_days: '3', pr_count: '2',
          badge_count: '4', is_current_user: true, period_start: '2026-08-17', period_end: '2026-08-23',
        }],
        error: null,
      };
    }
    if (name === 'get_group_social_feed') {
      return {
        data: [{
          activity_key: 'PR:abc123', activity_type: 'PR', activity_at: '2026-08-20T22:00:00Z',
          actor_user_id: 'user-2', username: 'alex', display_name: 'Alex', profile_picture_path: null,
          metadata: { exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: '120', previousBest: '115', weightKg: '100', reps: '6', scoringDate: '2026-08-20' },
          fire_count: '2', strong_count: '1', clap_count: '0', my_reaction: 'FIRE',
        }],
        error: null,
      };
    }
    if (name === 'set_group_activity_reaction') return { data: null, error: null };
    return { data: null, error: new Error(`Unexpected RPC ${name}`) };
  });

  const client = {
    rpc,
    storage: {
      from: vi.fn(() => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }) })),
    },
  };

  return { client, rpc };
}

describe('group social service', () => {
  it('maps authoritative standings, paginated feed summaries, and reactions', async () => {
    const { client, rpc } = createClient();
    const service = createGroupSocialService(client as never);

    const board = await service.loadLeaderboard('group-1', 'WEEK');
    expect(board.periodStart).toBe('2026-08-17');
    expect(board.periodEnd).toBe('2026-08-23');
    expect(board.entries[0]).toEqual(expect.objectContaining({ rank: 1, xp: 175, liftingDays: 3, prCount: 2, badgeCount: 4 }));
    expect(board.entries[0]?.profilePictureUrl).toBe('https://cdn.test/user-1/profile.webp');

    const page = await service.loadFeed('group-1');
    expect(page.items[0]).toEqual(expect.objectContaining({
      activityKey: 'PR:abc123', activityType: 'PR', myReaction: 'FIRE',
      reactions: { FIRE: 2, STRONG: 1, CLAP: 0 },
      metadata: expect.objectContaining({ exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: 120, weightKg: 100, reps: 6 }),
    }));
    expect(page.nextCursor).toBeNull();

    await service.setReaction('group-1', 'PR:abc123', 'STRONG');
    expect(rpc).toHaveBeenCalledWith('set_group_activity_reaction', {
      p_group_id: 'group-1', p_activity_key: 'PR:abc123', p_reaction_type: 'STRONG',
    });
    expect(rpc).toHaveBeenCalledWith('get_group_social_feed', expect.objectContaining({ p_limit: 21 }));
  });
});
