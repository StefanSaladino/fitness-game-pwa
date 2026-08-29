import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GlobalAllTimeLeaderboard, GroupSocialFeedItem, GroupSocialFeedPage } from '../model';
import type { GroupSocialService } from '../socialService';
import { useGlobalAllTimeLeaderboard } from './useGlobalAllTimeLeaderboard';
import { useGroupSocial } from './useGroupSocial';

const weekly = { period: 'WEEK' as const, periodStart: '2026-08-17', periodEnd: '2026-08-23', entries: [] };
const globalBoard: GlobalAllTimeLeaderboard = { top10: [], currentUser: null };
const activity: GroupSocialFeedItem = {
  activityKey: 'LIFT:opaque', activityType: 'LIFT', activityAt: '2026-08-20T22:00:00Z', actorUserId: 'user-1',
  username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
  metadata: { scoringDate: '2026-08-20', title: 'Strength session', durationMinutes: 45, exerciseCount: 5, xp: 80 },
  reactions: { FIRE: 0, STRONG: 0, CLAP: 0 }, myReaction: null,
};
const nextActivity: GroupSocialFeedItem = {
  ...activity, activityKey: 'PR:older', activityType: 'PR', activityAt: '2026-08-19T22:00:00Z',
  metadata: { exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: 120, previousBest: 115, weightKg: 100, reps: 6, scoringDate: '2026-08-19' },
};

function createService(options: { firstPage?: GroupSocialFeedPage; secondPage?: GroupSocialFeedPage; reactionError?: Error; global?: GlobalAllTimeLeaderboard } = {}): GroupSocialService {
  let feedCalls = 0;
  return {
    loadGroupLeaderboard: vi.fn(async () => weekly),
    loadGlobalAllTimeLeaderboard: vi.fn(async () => options.global ?? globalBoard),
    loadFeed: vi.fn(async () => {
      feedCalls += 1;
      if (feedCalls === 1) return options.firstPage ?? { items: [activity], nextCursor: null };
      return options.secondPage ?? { items: [], nextCursor: null };
    }),
    setReaction: vi.fn(async () => {
      if (options.reactionError) throw options.reactionError;
    }),
  };
}

describe('useGroupSocial', () => {
  it('loads weekly group standings only and optimistically applies one group reaction', async () => {
    const service = createService();
    const { result } = renderHook(() => useGroupSocial('group-1', service));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(service.loadGroupLeaderboard).toHaveBeenCalledWith('group-1');
    expect(service.loadGlobalAllTimeLeaderboard).not.toHaveBeenCalled();
    await act(async () => { await result.current.react('LIFT:opaque', 'FIRE'); });
    expect(result.current.feed.items[0]).toEqual(expect.objectContaining({
      myReaction: 'FIRE', reactions: { FIRE: 1, STRONG: 0, CLAP: 0 },
    }));
    expect(service.setReaction).toHaveBeenCalledWith('group-1', 'LIFT:opaque', 'FIRE');

    await act(async () => { await result.current.react('LIFT:opaque', 'FIRE'); });
    expect(result.current.feed.items[0]).toEqual(expect.objectContaining({
      myReaction: null, reactions: { FIRE: 0, STRONG: 0, CLAP: 0 },
    }));
    expect(service.setReaction).toHaveBeenLastCalledWith('group-1', 'LIFT:opaque', null);
  });

  it('rolls an optimistic reaction back when the guarded write fails', async () => {
    const service = createService({ reactionError: new Error('Reaction rejected') });
    const { result } = renderHook(() => useGroupSocial('group-1', service));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.react('LIFT:opaque', 'STRONG'); });
    expect(result.current.feed.items[0]).toEqual(activity);
    expect(result.current.error).toBe('Reaction rejected');
  });

  it('appends a cursor page without duplicating an activity already rendered', async () => {
    const cursor = { activityAt: activity.activityAt, activityKey: activity.activityKey };
    const service = createService({
      firstPage: { items: [activity], nextCursor: cursor },
      secondPage: { items: [activity, nextActivity], nextCursor: null },
    });
    const { result } = renderHook(() => useGroupSocial('group-1', service));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.loadMore(); });
    expect(result.current.feed.items.map((item) => item.activityKey)).toEqual(['LIFT:opaque', 'PR:older']);
    expect(result.current.feed.nextCursor).toBeNull();
    expect(service.loadFeed).toHaveBeenLastCalledWith('group-1', cursor);
  });
});

describe('useGlobalAllTimeLeaderboard', () => {
  it('loads only the dedicated global contract', async () => {
    const expected: GlobalAllTimeLeaderboard = { top10: [], currentUser: null };
    const service = createService({ global: expected });
    const { result } = renderHook(() => useGlobalAllTimeLeaderboard(service));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.leaderboard).toEqual(expected);
    expect(service.loadGlobalAllTimeLeaderboard).toHaveBeenCalledTimes(1);
    expect(service.loadGroupLeaderboard).not.toHaveBeenCalled();
    expect(service.loadFeed).not.toHaveBeenCalled();
  });
});
