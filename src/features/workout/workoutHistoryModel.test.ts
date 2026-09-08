import { describe, expect, it } from 'vitest';
import {
  buildWorkoutHistoryBlocks,
  type WorkoutHistoryExercise,
} from './workoutHistoryModel';

function exercise(
  id: string,
  orderIndex: number,
  supersetGroupId: string | null,
  supersetOrder: number | null,
): WorkoutHistoryExercise {
  return {
    id,
    exerciseId: `catalog-${id}`,
    canonicalName: id,
    measurementType: 'WEIGHT_REPS',
    orderIndex,
    supersetGroupId,
    supersetOrder,
    sets: [],
  };
}

describe('workout history Superset grouping', () => {
  it('preserves Superset membership and member order without flattening the completed workout', () => {
    const blocks = buildWorkoutHistoryBlocks([
      exercise('Bench Press', 0, 'group-a', 0),
      exercise('Cable Fly', 1, 'group-a', 1),
      exercise('Barbell Row', 2, null, null),
      exercise('Curl', 3, 'group-b', 1),
      exercise('Hammer Curl', 4, 'group-b', 0),
    ]);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({
      kind: 'superset',
      label: 'A',
      exercises: [
        { canonicalName: 'Bench Press' },
        { canonicalName: 'Cable Fly' },
      ],
    });
    expect(blocks[1]).toMatchObject({
      kind: 'exercise',
      exercise: { canonicalName: 'Barbell Row' },
    });
    expect(blocks[2]).toMatchObject({
      kind: 'superset',
      label: 'B',
      exercises: [
        { canonicalName: 'Hammer Curl' },
        { canonicalName: 'Curl' },
      ],
    });
  });

  it('keeps old non-Superset workouts as ordinary exercise history', () => {
    const blocks = buildWorkoutHistoryBlocks([
      exercise('Bench Press', 0, null, null),
      exercise('Barbell Row', 1, null, null),
    ]);

    expect(blocks.map((block) => block.kind)).toEqual(['exercise', 'exercise']);
  });

  it('falls back to an ordinary exercise when legacy data contains an orphaned group member', () => {
    const blocks = buildWorkoutHistoryBlocks([
      exercise('Bench Press', 0, 'orphan', 0),
      exercise('Barbell Row', 1, null, null),
    ]);

    expect(blocks.map((block) => block.kind)).toEqual(['exercise', 'exercise']);
  });
});
