import { describe, expect, it, vi } from 'vitest';
import { createExerciseAnalyticsTrackingService } from './analyticsTrackingService';

describe('exercise analytics tracking service', () => {
  it('loads canonical tracked exercise ids without duplicates', async () => {
    const select = vi.fn(async () => ({
      data: [
        { exercise_id: 'bench' },
        { exercise_id: 'bench' },
        { exercise_id: 'row' },
      ],
      error: null,
    }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as never;

    const ids = await createExerciseAnalyticsTrackingService(client).listTrackedExerciseIds();

    expect(from).toHaveBeenCalledWith('user_tracked_exercises');
    expect(select).toHaveBeenCalledWith('exercise_id');
    expect(ids).toEqual(['bench', 'row']);
  });

  it('uses the guarded preference RPC for track and untrack', async () => {
    const rpc = vi.fn(async (_name: string, payload: unknown) => ({
      data: (payload as { p_tracked: boolean }).p_tracked,
      error: null,
    }));
    const service = createExerciseAnalyticsTrackingService({ rpc } as never);

    await expect(service.setTracked('bench', true)).resolves.toBe(true);
    await expect(service.setTracked('bench', false)).resolves.toBe(false);

    expect(rpc).toHaveBeenNthCalledWith(1, 'set_my_exercise_analytics_tracking', {
      p_exercise_id: 'bench',
      p_tracked: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_my_exercise_analytics_tracking', {
      p_exercise_id: 'bench',
      p_tracked: false,
    });
  });
});
