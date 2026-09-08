import { describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutSession, WorkoutExercise, WorkoutSet } from '../model';
import {
  createWorkoutMutationQueueItem,
  parseWorkoutMutationQueue,
} from '../mutations/workoutMutationModel';
import { replayWorkoutMutations } from '../mutations/workoutMutationReplay';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import { deriveSupersetFlow } from '../supersetFlow';
import {
  createWorkoutRecoverySnapshot,
  parseWorkoutRecoverySnapshot,
  restoreWorkoutExercises,
  restoreWorkoutSession,
  restoreWorkoutSets,
} from './workoutRecoveryModel';

const groupId = '77777777-7777-4777-8777-777777777777';

const workout: ActiveWorkoutSession = {
  id: 'workout-1',
  userId: 'user-1',
  status: 'IN_PROGRESS',
  startedAt: '2026-09-05T12:00:00.000Z',
  endedAt: null,
  activeDurationSeconds: 437,
  timezoneAtStart: 'America/Toronto',
  scoringDate: '2026-09-05',
  pausedAt: '2026-09-05T12:08:00.000Z',
  lastResumedAt: '2026-09-05T12:00:43.000Z',
};

const exercises: WorkoutExercise[] = [
  {
    id: 'we-1',
    workoutId: workout.id,
    exerciseId: 'e-1',
    orderIndex: 0,
    supersetGroupId: groupId,
    supersetOrder: 0,
    revision: 4,
    canonicalName: 'Bench Press',
    measurementType: 'WEIGHT_REPS',
  },
  {
    id: 'we-2',
    workoutId: workout.id,
    exerciseId: 'e-2',
    orderIndex: 1,
    supersetGroupId: groupId,
    supersetOrder: 1,
    revision: 2,
    canonicalName: 'Cable Fly',
    measurementType: 'WEIGHT_REPS',
  },
  {
    id: 'we-3',
    workoutId: workout.id,
    exerciseId: 'e-3',
    orderIndex: 2,
    supersetGroupId: groupId,
    supersetOrder: 2,
    revision: 1,
    canonicalName: 'Push-up',
    measurementType: 'BODYWEIGHT_REPS',
  },
];

const sets: WorkoutSet[] = [
  {
    id: 'a1-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING',
    weightKg: 102.058, reps: 8, bodyweightMode: null, completed: true,
    completedAt: '2026-09-05T12:02:00.000Z', revision: 1,
  },
  {
    id: 'a2-1', workoutExerciseId: 'we-2', setNumber: 1, setType: 'WORKING',
    weightKg: 15.876, reps: 12, bodyweightMode: null, completed: true,
    completedAt: '2026-09-05T12:03:00.000Z', revision: 1,
  },
  {
    id: 'a3-1', workoutExerciseId: 'we-3', setNumber: 1, setType: 'WORKING',
    weightKg: null, reps: 15, bodyweightMode: 'BODYWEIGHT', completed: false,
    completedAt: null, revision: 0,
  },
  {
    id: 'a1-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING',
    weightKg: 102.058, reps: 8, bodyweightMode: null, completed: false,
    completedAt: null, revision: 0,
  },
  {
    id: 'a2-2', workoutExerciseId: 'we-2', setNumber: 2, setType: 'WORKING',
    weightKg: 15.876, reps: 12, bodyweightMode: null, completed: false,
    completedAt: null, revision: 0,
  },
  {
    id: 'a3-2', workoutExerciseId: 'we-3', setNumber: 2, setType: 'WORKING',
    weightKg: null, reps: 15, bodyweightMode: 'BODYWEIGHT', completed: false,
    completedAt: null, revision: 0,
  },
];

function recoverySnapshot() {
  return createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null, 10_000);
}

describe('Phase 18.5 Superset recovery reliability', () => {
  it('restores grouping, order, completed sets, timer state, and derives the next round-robin step', () => {
    const parsed = parseWorkoutRecoverySnapshot(
      JSON.parse(JSON.stringify(recoverySnapshot())) as unknown,
      'user-1',
    );

    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error('Expected a valid recovery snapshot.');

    const recoveredWorkout = restoreWorkoutSession(parsed.session);
    const recoveredExercises = restoreWorkoutExercises(parsed);
    const recoveredSets = restoreWorkoutSets(parsed);
    const flow = deriveSupersetFlow(recoveredExercises, recoveredSets);

    expect(recoveredExercises.map((exercise) => [
      exercise.canonicalName,
      exercise.supersetGroupId,
      exercise.supersetOrder,
    ])).toEqual([
      ['Bench Press', groupId, 0],
      ['Cable Fly', groupId, 1],
      ['Push-up', groupId, 2],
    ]);
    expect(flow).toEqual(expect.objectContaining({
      completedSets: 2,
      totalSets: 6,
      currentExerciseId: 'we-3',
      currentSupersetOrder: 2,
      currentSetNumber: 1,
      complete: false,
    }));
    expect(recoveredWorkout).toEqual(expect.objectContaining({
      activeDurationSeconds: 437,
      pausedAt: '2026-09-05T12:08:00.000Z',
      lastResumedAt: '2026-09-05T12:00:43.000Z',
    }));
  });

  it('re-derives the current Superset step after an earlier completed set is edited', () => {
    const parsed = parseWorkoutRecoverySnapshot(recoverySnapshot(), 'user-1');
    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error('Expected a valid recovery snapshot.');

    const recoveredExercises = restoreWorkoutExercises(parsed);
    const recoveredSets = restoreWorkoutSets(parsed);
    const editedSets = recoveredSets.map((set) => set.id === 'a2-1'
      ? { ...set, completed: false, completedAt: null, revision: set.revision + 1 }
      : set);

    expect(deriveSupersetFlow(recoveredExercises, editedSets)).toEqual(expect.objectContaining({
      completedSets: 1,
      currentExerciseId: 'we-2',
      currentSupersetOrder: 1,
      currentSetNumber: 1,
      complete: false,
    }));
  });

  it('rejects half-reconstructed Superset membership and corrupted exercise/set order', () => {
    const snapshot = recoverySnapshot();

    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      exercises: snapshot.exercises.map((exercise) => exercise.id === 'we-2'
        ? { ...exercise, supersetGroupId: null, supersetOrder: null }
        : exercise),
    }, 'user-1')).toBeNull();

    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      exercises: snapshot.exercises.map((exercise) => exercise.id === 'we-3'
        ? { ...exercise, supersetOrder: 3 }
        : exercise),
    }, 'user-1')).toBeNull();

    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      exercises: snapshot.exercises.map((exercise) => exercise.id === 'we-3'
        ? { ...exercise, orderIndex: 1 }
        : exercise),
    }, 'user-1')).toBeNull();

    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      sets: [
        ...snapshot.sets,
        { ...snapshot.sets[0], id: 'duplicate-set-number' },
      ],
    }, 'user-1')).toBeNull();
  });

  it('drops stale drafts for deleted sets instead of reviving removed local UI state', () => {
    const snapshot = recoverySnapshot();
    snapshot.ui.setDrafts['a1-2'] = {
      setType: 'WORKING',
      weight: '225',
      reps: '8',
      bodyweightMode: 'BODYWEIGHT',
    };
    snapshot.ui.setDrafts['deleted-set'] = {
      setType: 'WORKING',
      weight: '999',
      reps: '99',
      bodyweightMode: 'BODYWEIGHT',
    };

    const parsed = parseWorkoutRecoverySnapshot(snapshot, 'user-1');

    expect(parsed?.ui.setDrafts['a1-2']).toBeDefined();
    expect(parsed?.ui.setDrafts['deleted-set']).toBeUndefined();
  });

  it('keeps a queued Superset mutation on the same idempotency key across a connection failure and replay', async () => {
    const queued = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      {
        kind: 'SET_SUPERSET',
        payload: {
          supersetGroupId: groupId,
          expectedMembers: [],
          members: [
            {
              workoutExerciseId: 'we-1',
              supersetOrder: 0,
              expectedRevision: 4,
              expectedSupersetGroupId: null,
            },
            {
              workoutExerciseId: 'we-2',
              supersetOrder: 1,
              expectedRevision: 2,
              expectedSupersetGroupId: null,
            },
          ],
        },
      },
      '55555555-5555-4555-8555-555555555555',
      1_000,
    );

    const reparsed = parseWorkoutMutationQueue(
      JSON.parse(JSON.stringify([queued])) as unknown,
      'user-1',
    );
    expect(reparsed).not.toBeNull();
    expect(reparsed?.[0]).toEqual(expect.objectContaining({
      kind: 'SET_SUPERSET',
      idempotencyKey: queued.idempotencyKey,
    }));

    let shouldFail = true;
    const apply = vi.fn<WorkoutMutationService['apply']>(async (_item) => {
      if (shouldFail) {
        shouldFail = false;
        throw new TypeError('Failed to fetch');
      }
    });
    const service = { apply } as WorkoutMutationService;

    const firstReplay = await replayWorkoutMutations([queued], service, () => 2_000);
    expect(firstReplay.items[0]).toEqual(expect.objectContaining({
      idempotencyKey: queued.idempotencyKey,
      status: 'pending',
      attemptCount: 1,
    }));

    const secondReplay = await replayWorkoutMutations(firstReplay.items, service, () => 4_000);
    expect(secondReplay.items).toEqual([]);
    expect(secondReplay.appliedCount).toBe(1);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls.map(([item]) => item.idempotencyKey)).toEqual([
      queued.idempotencyKey,
      queued.idempotencyKey,
    ]);
  });

  it('round-trips queued CLEAR_SUPERSET membership snapshots without flattening them', () => {
    const queued = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      {
        kind: 'CLEAR_SUPERSET',
        payload: {
          supersetGroupId: groupId,
          expectedMembers: [
            { workoutExerciseId: 'we-1', expectedRevision: 4 },
            { workoutExerciseId: 'we-2', expectedRevision: 2 },
            { workoutExerciseId: 'we-3', expectedRevision: 1 },
          ],
        },
      },
      '66666666-6666-4666-8666-666666666666',
      1_000,
    );

    const parsed = parseWorkoutMutationQueue(
      JSON.parse(JSON.stringify([queued])) as unknown,
      'user-1',
    );

    expect(parsed?.[0]?.payload).toEqual(queued.payload);
  });
});
