import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutMutationExecutor } from '../mutations/workoutMutationModel';
import type { WorkoutSetService } from '../workoutSetService';
import { useWorkoutSets } from './useWorkoutSets';

const setRow = {
  id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING' as const,
  setVariant: 'STANDARD' as const, segments: [],
  weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0,
};

function service(): WorkoutSetService {
  return {
    loadWorkoutSets: vi.fn(async () => [setRow]),
    addSet: vi.fn(async () => 'set-2'),
    addAdvancedSet: vi.fn(async () => 'set-2'),
    copySet: vi.fn(async () => 'set-2'),
    saveSet: vi.fn(async () => 'set-1'),
    saveAdvancedSet: vi.fn(async () => 'set-1'),
    removeSet: vi.fn(async () => undefined),
  };
}

describe('useWorkoutSets', () => {
  it('loads persisted sets for the current exercise identities', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.sets).toEqual([setRow]);
    expect(injected.loadWorkoutSets).toHaveBeenCalledWith(['we-1']);
  });

  it('reports loading immediately when exercise identities change', async () => {
    let resolveLoad: ((value: typeof setRow[]) => void) | null = null;
    const injected = {
      ...service(),
      loadWorkoutSets: vi.fn(() => new Promise<typeof setRow[]>((resolve) => { resolveLoad = resolve; })),
    };
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useWorkoutSets(ids, injected),
      { initialProps: { ids: [] as string[] } },
    );

    expect(result.current.status).toBe('ready');
    rerender({ ids: ['we-1'] });
    expect(result.current.status).toBe('loading');
    expect(result.current.sets).toEqual([]);

    await act(async () => { resolveLoad?.([setRow]); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.sets).toEqual([setRow]);
  });

  it('reloads after set mutations so independent row state remains authoritative', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 105, reps: 4, bodyweightMode: null, completed: true });
    });

    expect(injected.saveSet).toHaveBeenCalledWith('set-1', expect.objectContaining({ weightKg: 105, reps: 4, completed: true }));
    expect(injected.loadWorkoutSets).toHaveBeenCalledTimes(2);
  });

  it('routes queued saves through the mutation executor and keeps the local row current', async () => {
    const injected = service();
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'queued' as const, idempotencyKey: '11111111-1111-4111-8111-111111111111' })),
    };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let saved = true;
    await act(async () => {
      saved = await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 107.5, reps: 3, bodyweightMode: null, completed: false });
    });

    expect(saved).toBe(false);
    expect(executor.execute).toHaveBeenCalledWith({
      kind: 'SAVE_SET',
      payload: { workoutSetId: 'set-1', setType: 'WORKING', weightKg: 107.5, reps: 3, bodyweightMode: null, completed: false, expectedRevision: 0 },
    });
    expect(injected.saveSet).not.toHaveBeenCalled();
    expect(result.current.sets[0]).toEqual(expect.objectContaining({ weightKg: 107.5, reps: 3, revision: 1 }));
    expect(injected.loadWorkoutSets).toHaveBeenCalledTimes(1);
  });

  it('queues one logical advanced set and preserves all segment values during offline save', async () => {
    const injected = service();
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'queued' as const, idempotencyKey: '99999999-9999-4999-8999-999999999999' })),
    };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.addAdvancedSet('we-1', 'FULL_PYRAMID'); });
    await act(async () => {
      await result.current.saveAdvancedSet('set-1', {
        variant: 'FULL_PYRAMID',
        segments: [
          { weightKg: 80, reps: 8 },
          { weightKg: 100, reps: 5 },
          { weightKg: 80, reps: 8 },
        ],
        completed: true,
      });
    });

    expect(executor.execute).toHaveBeenNthCalledWith(1, {
      kind: 'ADD_ADVANCED_SET', payload: { workoutExerciseId: 'we-1', variant: 'FULL_PYRAMID' },
    });
    expect(executor.execute).toHaveBeenNthCalledWith(2, {
      kind: 'SAVE_ADVANCED_SET',
      payload: {
        workoutSetId: 'set-1', variant: 'FULL_PYRAMID', completed: true, expectedRevision: 0,
        segments: [{ weightKg: 80, reps: 8 }, { weightKg: 100, reps: 5 }, { weightKg: 80, reps: 8 }],
      },
    });
    expect(result.current.sets[0]).toEqual(expect.objectContaining({
      setVariant: 'FULL_PYRAMID', weightKg: 100, reps: 5, revision: 1,
      segments: [
        expect.objectContaining({ segmentIndex: 0, weightKg: 80, reps: 8 }),
        expect.objectContaining({ segmentIndex: 1, weightKg: 100, reps: 5 }),
        expect.objectContaining({ segmentIndex: 2, weightKg: 80, reps: 8 }),
      ],
    }));
  });

  it('carries the loaded set revision into copy and remove mutations', async () => {
    const injected = service();
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'applied' as const, idempotencyKey: '66666666-6666-4666-8666-666666666666' })),
    };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.copySet('set-1'); });
    await act(async () => { await result.current.removeSet('set-1'); });

    expect(executor.execute).toHaveBeenNthCalledWith(1, { kind: 'COPY_SET', payload: { workoutSetId: 'set-1', expectedRevision: 0 } });
    expect(executor.execute).toHaveBeenNthCalledWith(2, { kind: 'REMOVE_SET', payload: { workoutSetId: 'set-1', expectedRevision: 0 } });
  });

  it('does not optimistically overwrite a set when the server reports a revision conflict', async () => {
    const injected = service();
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'conflict' as const, idempotencyKey: '44444444-4444-4444-8444-444444444444', error: 'WORKOUT_CONFLICT: Set changed on the server.' })),
    };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let saved = true;
    await act(async () => {
      saved = await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 120, reps: 2, bodyweightMode: null, completed: false });
    });

    expect(saved).toBe(false);
    expect(result.current.sets[0]).toEqual(setRow);
    expect(result.current.error).toContain('server version');
  });

  it('advances expected revisions synchronously across rapid queued saves', async () => {
    const injected = service();
    const execute = vi.fn(async () => ({ state: 'queued' as const, idempotencyKey: '88888888-8888-4888-8888-888888888888' }));
    const executor: WorkoutMutationExecutor = { execute };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 105, reps: 4, bodyweightMode: null, completed: false });
      await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 110, reps: 3, bodyweightMode: null, completed: false });
    });

    expect(execute).toHaveBeenNthCalledWith(1, expect.objectContaining({ payload: expect.objectContaining({ expectedRevision: 0 }) }));
    expect(execute).toHaveBeenNthCalledWith(2, expect.objectContaining({ payload: expect.objectContaining({ expectedRevision: 1 }) }));
    expect(result.current.sets[0]?.revision).toBe(2);
  });

  it('continues the optimistic revision chain from recovered sets after an offline restart', async () => {
    const injected = { ...service(), loadWorkoutSets: vi.fn(async () => { throw new Error('network unavailable'); }) };
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'queued' as const, idempotencyKey: '77777777-7777-4777-8777-777777777777' })),
    };
    const onQueuedSetRevision = vi.fn();
    const recovered = [{ ...setRow, revision: 4 }];
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor, recovered, onQueuedSetRevision));
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 112.5, reps: 3, bodyweightMode: null, completed: false });
    });

    expect(executor.execute).toHaveBeenCalledWith({
      kind: 'SAVE_SET',
      payload: { workoutSetId: 'set-1', setType: 'WORKING', weightKg: 112.5, reps: 3, bodyweightMode: null, completed: false, expectedRevision: 4 },
    });
    expect(onQueuedSetRevision).toHaveBeenCalledWith('set-1', 5);
    expect(result.current.sets[0]?.revision).toBe(5);
  });

  it('stays ready without making a request when the workout has no exercises', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets([], injected));
    expect(result.current.status).toBe('ready');
    expect(result.current.sets).toEqual([]);
    expect(injected.loadWorkoutSets).not.toHaveBeenCalled();
  });
});
