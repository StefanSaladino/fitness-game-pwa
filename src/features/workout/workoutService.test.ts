import { describe, expect, it, vi } from 'vitest';
import { createWorkoutService } from './workoutService';

const row = {
  id: 'workout-1',
  user_id: 'user-1',
  status: 'IN_PROGRESS',
  started_at: '2026-08-19T22:00:00.000Z',
  ended_at: null,
  active_duration_seconds: 0,
  timezone_at_start: 'America/Toronto',
  scoring_date: '2026-08-19',
  paused_at: null,
  last_resumed_at: '2026-08-19T22:00:00.000Z',
};

function queryResult(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'order', 'limit']) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data, error: null }));
  chain.single = vi.fn(async () => ({ data, error: null }));
  return chain;
}

describe('workoutService', () => {
  it('loads only the current user in-progress in-app strength session', async () => {
    const query = queryResult(row);
    const client = { from: vi.fn(() => query), rpc: vi.fn() } as never;
    const workout = await createWorkoutService(client).loadActiveWorkout('user-1');

    expect(workout?.id).toBe('workout-1');
    expect(query.eq).toHaveBeenCalledWith('category', 'STRENGTH');
    expect(query.eq).toHaveBeenCalledWith('source', 'IN_APP');
    expect(query.eq).toHaveBeenCalledWith('status', 'IN_PROGRESS');
  });

  it('starts from the user action timestamp and receives the session snapshot in one RPC', async () => {
    const rpc = vi.fn(async () => ({ data: row, error: null }));
    const client = { from: vi.fn(), rpc } as never;
    const workout = await createWorkoutService(client).startOrResumeWorkout(Date.parse('2026-08-19T22:00:00.000Z'));

    expect(workout.id).toBe('workout-1');
    expect(rpc).toHaveBeenCalledWith('start_or_resume_lifting_workout_intent', {
      p_action_at: '2026-08-19T22:00:00.000Z',
    });
    expect((client as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('pauses and resumes from user action timestamps without a follow-up select round trip', async () => {
    const rpc = vi.fn(async () => ({ data: row, error: null }));
    const client = { from: vi.fn(), rpc } as never;
    const service = createWorkoutService(client);

    await service.pauseWorkout('workout-1', Date.parse('2026-08-19T22:01:00.000Z'));
    await service.resumeWorkout('workout-1', Date.parse('2026-08-19T22:02:00.000Z'));

    expect(rpc).toHaveBeenNthCalledWith(1, 'pause_lifting_workout_intent', {
      p_workout_id: 'workout-1',
      p_action_at: '2026-08-19T22:01:00.000Z',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'resume_lifting_workout_intent', {
      p_workout_id: 'workout-1',
      p_action_at: '2026-08-19T22:02:00.000Z',
    });
    expect((client as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('finishes and cancels only through lifecycle RPCs', async () => {
    const rpc = vi.fn(async () => ({ data: 'workout-1', error: null }));
    const client = { from: vi.fn(), rpc } as never;
    const service = createWorkoutService(client);

    await service.finishWorkout('workout-1');
    await service.cancelWorkout('workout-1');

    expect(rpc).toHaveBeenNthCalledWith(1, 'finish_lifting_workout', { p_workout_id: 'workout-1' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'cancel_lifting_workout', { p_workout_id: 'workout-1' });
  });
});
