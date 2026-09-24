import { describe, expect, it } from 'vitest';
import {
  normalizeTrainingProgramConstraintEntries,
  normalizeTrainingProgramConstraintSnapshot,
  trainingProgramExcludedExerciseIds,
  trainingProgramPreferredExerciseIds,
} from './trainingProgramConstraints';

describe('training program constraints', () => {
  it('normalizes and sorts a persisted snapshot', () => {
    expect(normalizeTrainingProgramConstraintSnapshot(3, [
      { exerciseId: 'z', kind: 'EXCLUDE', reason: 'OTHER' },
      { exerciseId: 'a', kind: 'PREFER', reason: 'PREFERENCE' },
    ])).toEqual({
      revision: 3,
      entries: [
        { exerciseId: 'a', kind: 'PREFER', reason: 'PREFERENCE' },
        { exerciseId: 'z', kind: 'EXCLUDE', reason: 'OTHER' },
      ],
    });
  });

  it('allows a replace payload before its first persisted revision exists', () => {
    expect(normalizeTrainingProgramConstraintEntries([
      { exerciseId: 'bench', kind: 'EXCLUDE', reason: 'PHYSICAL_LIMITATION' },
    ])).toHaveLength(1);
  });

  it('rejects entries on an unpersisted revision-zero snapshot', () => {
    expect(() => normalizeTrainingProgramConstraintSnapshot(0, [
      { exerciseId: 'bench', kind: 'EXCLUDE', reason: 'OTHER' },
    ])).toThrow('Unpersisted');
  });

  it('rejects duplicate exercise constraints', () => {
    expect(() => normalizeTrainingProgramConstraintEntries([
      { exerciseId: 'bench', kind: 'EXCLUDE', reason: 'OTHER' },
      { exerciseId: 'bench', kind: 'PREFER', reason: 'PREFERENCE' },
    ])).toThrow('cannot repeat');
  });

  it('does not allow physical-limitation semantics on a soft preference', () => {
    expect(() => normalizeTrainingProgramConstraintEntries([
      {
        exerciseId: 'bench',
        kind: 'PREFER',
        reason: 'PHYSICAL_LIMITATION',
      },
    ])).toThrow('PREFERENCE reason');
  });

  it('builds hard-exclusion and soft-preference sets independently', () => {
    const snapshot = normalizeTrainingProgramConstraintSnapshot(2, [
      { exerciseId: 'bench', kind: 'EXCLUDE', reason: 'OTHER' },
      { exerciseId: 'row', kind: 'PREFER', reason: 'PREFERENCE' },
    ]);

    expect(trainingProgramExcludedExerciseIds(snapshot)).toEqual(
      new Set(['bench']),
    );
    expect(trainingProgramPreferredExerciseIds(snapshot)).toEqual(
      new Set(['row']),
    );
  });
});
