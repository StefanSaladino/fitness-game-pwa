import { describe, expect, it } from 'vitest';
import type { ActiveWorkoutSession, WorkoutExercise, WorkoutSet } from '../model';
import {
  createWorkoutRecoverySnapshot,
  parseWorkoutRecoverySnapshot,
  restoreWorkoutExercises,
  restoreWorkoutSession,
  restoreWorkoutSets,
} from './workoutRecoveryModel';

const workout: ActiveWorkoutSession = {
  id: 'workout-1', userId: 'user-1', status: 'IN_PROGRESS', startedAt: '2026-08-20T01:00:00.000Z', endedAt: null,
  activeDurationSeconds: 90, timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null,
  lastResumedAt: '2026-08-20T01:01:30.000Z',
};
const exercises: WorkoutExercise[] = [
  { id: 'we-2', workoutId: 'workout-1', exerciseId: 'e-2', orderIndex: 1, supersetGroupId: '11111111-1111-4111-8111-111111111111', supersetOrder: 1, revision: 0, canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS' },
  { id: 'we-1', workoutId: 'workout-1', exerciseId: 'e-1', orderIndex: 0, supersetGroupId: '11111111-1111-4111-8111-111111111111', supersetOrder: 0, revision: 0, canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS' },
];
const sets: WorkoutSet[] = [
  { id: 'set-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
  { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WARMUP', weightKg: 60, reps: 10, bodyweightMode: null, completed: true, completedAt: '2026-08-20T01:02:00.000Z', revision: 0 },
];

describe('workout recovery snapshot model', () => {
  it('creates a separate ordered recovery contract and restores domain models', () => {
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null, 1234);

    expect(snapshot.savedAtMs).toBe(1234);
    expect(snapshot.exercises.map((exercise) => exercise.id)).toEqual(['we-1', 'we-2']);
    expect(snapshot.exercises.map((exercise) => [exercise.supersetGroupId, exercise.supersetOrder])).toEqual([
      ['11111111-1111-4111-8111-111111111111', 0],
      ['11111111-1111-4111-8111-111111111111', 1],
    ]);
    expect(snapshot.sets.map((set) => set.id)).toEqual(['set-1', 'set-2']);
    expect(snapshot.session).not.toHaveProperty('status');
    expect(snapshot.session).not.toHaveProperty('endedAt');

    expect(restoreWorkoutSession(snapshot.session)).toEqual(workout);
    expect(restoreWorkoutExercises(snapshot).map((exercise) => [exercise.id, exercise.supersetOrder])).toEqual([['we-1', 0], ['we-2', 1]]);
    expect(restoreWorkoutSets(snapshot).map((set) => set.id)).toEqual(['set-1', 'set-2']);
  });

  it('preserves unsaved set drafts and display unit only for the same active workout', () => {
    const first = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null, 1000);
    first.ui.weightUnit = 'LB';
    first.ui.setDrafts['set-2'] = { setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT' };

    const sameWorkout = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, first, 2000);
    expect(sameWorkout.ui.weightUnit).toBe('LB');
    expect(sameWorkout.ui.setDrafts['set-2']?.reps).toBe('6');

    const otherWorkout = createWorkoutRecoverySnapshot('user-1', { ...workout, id: 'workout-2' }, [], [], first, 3000);
    expect(otherWorkout.ui).toEqual({ weightUnit: 'KG', setDrafts: {} });
  });


  it('normalizes legacy recovery snapshots without conflict revisions or Superset metadata', () => {
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null, 1234) as unknown as Record<string, unknown>;
    const legacyExercises = (snapshot.exercises as Array<Record<string, unknown>>).map(({
      revision: _revision,
      supersetGroupId: _supersetGroupId,
      supersetOrder: _supersetOrder,
      ...exercise
    }) => exercise);
    const legacySets = (snapshot.sets as Array<Record<string, unknown>>).map(({ revision: _revision, ...set }) => set);
    const parsed = parseWorkoutRecoverySnapshot({ ...snapshot, exercises: legacyExercises, sets: legacySets }, 'user-1');

    expect(parsed).not.toBeNull();
    expect(parsed?.exercises.every((exercise) => exercise.revision === 0)).toBe(true);
    expect(parsed?.exercises.every((exercise) => exercise.supersetGroupId === null && exercise.supersetOrder === null)).toBe(true);
    expect(parsed?.sets.every((set) => set.revision === 0)).toBe(true);
  });

  it('preserves segmented advanced sets and unsaved stage drafts across recovery', () => {
    const advancedSet: WorkoutSet = {
      ...sets[0],
      setType: 'DROP',
      setVariant: 'DROP',
      segments: [
        { id: 'segment-1', workoutSetId: 'set-2', segmentIndex: 0, weightKg: 100, reps: 8 },
        { id: 'segment-2', workoutSetId: 'set-2', segmentIndex: 1, weightKg: 80, reps: 10 },
      ],
    };
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, [sets[1], advancedSet], null, 1234);
    snapshot.ui.setDrafts['set-2'] = {
      setType: 'DROP',
      setVariant: 'DROP',
      weight: '',
      reps: '',
      bodyweightMode: 'BODYWEIGHT',
      segments: [{ weight: '100', reps: '8' }, { weight: '75', reps: '12' }],
    };

    const parsed = parseWorkoutRecoverySnapshot(snapshot, 'user-1');

    expect(parsed?.sets.find((set) => set.id === 'set-2')?.segments).toHaveLength(2);
    expect(parsed?.ui.setDrafts['set-2']?.setVariant).toBe('DROP');
    expect(parsed?.ui.setDrafts['set-2']?.segments?.[1]).toEqual({ weight: '75', reps: '12' });
  });

  it('rejects corrupted or cross-user recovery payloads', () => {
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null);
    expect(parseWorkoutRecoverySnapshot(snapshot, 'user-1')).not.toBeNull();
    expect(parseWorkoutRecoverySnapshot(snapshot, 'user-2')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({ ...snapshot, version: 99 }, 'user-1')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({ ...snapshot, exercises: [{ nope: true }] }, 'user-1')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      exercises: snapshot.exercises.map((exercise, index) => index === 0
        ? { ...exercise, supersetGroupId: null, supersetOrder: 0 }
        : exercise),
    }, 'user-1')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({
      ...snapshot,
      exercises: snapshot.exercises.map((exercise) => ({ ...exercise, supersetOrder: 0 })),
    }, 'user-1')).toBeNull();
  });
});
