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
  { id: 'we-2', workoutId: 'workout-1', exerciseId: 'e-2', orderIndex: 1, canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS' },
  { id: 'we-1', workoutId: 'workout-1', exerciseId: 'e-1', orderIndex: 0, canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS' },
];
const sets: WorkoutSet[] = [
  { id: 'set-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null },
  { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WARMUP', weightKg: 60, reps: 10, bodyweightMode: null, completed: true, completedAt: '2026-08-20T01:02:00.000Z' },
];

describe('workout recovery snapshot model', () => {
  it('creates a separate ordered recovery contract and restores domain models', () => {
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null, 1234);

    expect(snapshot.savedAtMs).toBe(1234);
    expect(snapshot.exercises.map((exercise) => exercise.id)).toEqual(['we-1', 'we-2']);
    expect(snapshot.sets.map((set) => set.id)).toEqual(['set-1', 'set-2']);
    expect(snapshot.session).not.toHaveProperty('status');
    expect(snapshot.session).not.toHaveProperty('endedAt');

    expect(restoreWorkoutSession(snapshot.session)).toEqual(workout);
    expect(restoreWorkoutExercises(snapshot).map((exercise) => exercise.id)).toEqual(['we-1', 'we-2']);
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

  it('rejects corrupted or cross-user recovery payloads', () => {
    const snapshot = createWorkoutRecoverySnapshot('user-1', workout, exercises, sets, null);
    expect(parseWorkoutRecoverySnapshot(snapshot, 'user-1')).not.toBeNull();
    expect(parseWorkoutRecoverySnapshot(snapshot, 'user-2')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({ ...snapshot, version: 99 }, 'user-1')).toBeNull();
    expect(parseWorkoutRecoverySnapshot({ ...snapshot, exercises: [{ nope: true }] }, 'user-1')).toBeNull();
  });
});
