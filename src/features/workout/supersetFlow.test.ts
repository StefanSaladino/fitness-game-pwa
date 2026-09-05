import { describe, expect, it } from 'vitest';
import type { WorkoutExercise, WorkoutSet } from './model';
import { deriveSupersetFlow } from './supersetFlow';

const groupId = '77777777-7777-4777-8777-777777777777';
const members: WorkoutExercise[] = [
  { id: 'a1', workoutId: 'workout-1', exerciseId: 'exercise-1', orderIndex: 0, supersetGroupId: groupId, supersetOrder: 0, revision: 0, canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS' },
  { id: 'a2', workoutId: 'workout-1', exerciseId: 'exercise-2', orderIndex: 1, supersetGroupId: groupId, supersetOrder: 1, revision: 0, canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS' },
];

function set(id: string, workoutExerciseId: string, setNumber: number, completed: boolean): WorkoutSet {
  return {
    id,
    workoutExerciseId,
    setNumber,
    setType: 'WORKING',
    weightKg: workoutExerciseId === 'a1' ? 100 : null,
    reps: 5,
    bodyweightMode: workoutExerciseId === 'a2' ? 'BODYWEIGHT' : null,
    completed,
    completedAt: completed ? '2026-09-05T12:00:00.000Z' : null,
    revision: 0,
  };
}

describe('Superset active flow', () => {
  it('walks sets round-robin by set number and Superset member order', () => {
    const flow = deriveSupersetFlow(members, [
      set('a1-1', 'a1', 1, true),
      set('a2-1', 'a2', 1, false),
      set('a1-2', 'a1', 2, false),
      set('a2-2', 'a2', 2, false),
    ]);

    expect(flow).toEqual({
      completedSets: 1,
      totalSets: 4,
      currentExerciseId: 'a2',
      currentSupersetOrder: 1,
      currentSetNumber: 1,
      complete: false,
    });
  });

  it('starts with the first member when the Superset has no sets yet', () => {
    expect(deriveSupersetFlow(members, [])).toEqual({
      completedSets: 0,
      totalSets: 0,
      currentExerciseId: 'a1',
      currentSupersetOrder: 0,
      currentSetNumber: null,
      complete: false,
    });
  });

  it('marks the Superset complete when every existing set is done', () => {
    const flow = deriveSupersetFlow(members, [
      set('a1-1', 'a1', 1, true),
      set('a2-1', 'a2', 1, true),
    ]);

    expect(flow.completedSets).toBe(2);
    expect(flow.totalSets).toBe(2);
    expect(flow.currentExerciseId).toBeNull();
    expect(flow.complete).toBe(true);
  });

  it('skips a member that has no set at a particular round instead of inventing one', () => {
    const flow = deriveSupersetFlow(members, [
      set('a1-1', 'a1', 1, true),
      set('a2-1', 'a2', 1, true),
      set('a1-2', 'a1', 2, false),
    ]);

    expect(flow.currentExerciseId).toBe('a1');
    expect(flow.currentSetNumber).toBe(2);
    expect(flow.totalSets).toBe(3);
  });
});
