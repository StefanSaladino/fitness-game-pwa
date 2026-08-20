import { describe, expect, it } from 'vitest';
import type { ExercisePickerItem } from './model';
import { filterAndRankExercises, groupExercises, recentExercises } from './exerciseSearch';

const catalog: ExercisePickerItem[] = [
  { id: '1', canonicalName: 'Romanian Deadlift', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'HAMSTRINGS', workoutType: 'BARBELL', aliases: ['RDL'], lastUsedAt: null },
  { id: '2', canonicalName: 'Overhead Press', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'SHOULDERS', workoutType: 'BARBELL', aliases: ['OHP'], lastUsedAt: '2026-08-18T12:00:00.000Z' },
  { id: '3', canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'CHEST', workoutType: 'BARBELL', aliases: ['Bench Press'], lastUsedAt: '2026-08-17T12:00:00.000Z' },
  { id: '4', canonicalName: 'Dumbbell Bench Press', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'CHEST', workoutType: 'DUMBBELL', aliases: ['DB Bench'], lastUsedAt: null },
  { id: '5', canonicalName: 'Box Jump', measurementType: 'OTHER', primaryMuscleGroup: 'QUADS', workoutType: 'PLYOMETRIC', aliases: ['Box Jumps'], lastUsedAt: null },
  { id: '6', canonicalName: 'Side Plank', measurementType: 'DURATION', primaryMuscleGroup: 'OBLIQUES', workoutType: 'ISOMETRIC', aliases: [], lastUsedAt: null },
];

const all = { muscleGroup: '' as const, workoutType: '' as const };

describe('exercise picker search', () => {
  it('resolves shorthand aliases such as RDL and OHP', () => {
    expect(filterAndRankExercises(catalog, { ...all, query: 'rdl' })[0]?.canonicalName).toBe('Romanian Deadlift');
    expect(filterAndRankExercises(catalog, { ...all, query: 'ohp' })[0]?.canonicalName).toBe('Overhead Press');
  });

  it('tolerates small exercise-name typos', () => {
    expect(filterAndRankExercises(catalog, { ...all, query: 'barbel bench' })[0]?.canonicalName).toBe('Barbell Bench Press');
  });

  it('combines muscle and workout-type filters', () => {
    const result = filterAndRankExercises(catalog, { query: '', muscleGroup: 'CHEST', workoutType: 'DUMBBELL' });
    expect(result.map((exercise) => exercise.canonicalName)).toEqual(['Dumbbell Bench Press']);
  });

  it('groups the same catalogue by either muscle group or workout type', () => {
    expect(groupExercises(catalog, 'muscle').find((group) => group.label === 'Chest')?.exercises).toHaveLength(2);
    expect(groupExercises(catalog, 'type').find((group) => group.label === 'Barbell')?.exercises).toHaveLength(3);
  });

  it('treats obliques as a first-class muscle filter', () => {
    const result = filterAndRankExercises(catalog, { query: '', muscleGroup: 'OBLIQUES', workoutType: '' });
    expect(result.map((exercise) => exercise.canonicalName)).toEqual(['Side Plank']);
  });

  it('sorts recent exercises by persisted last-used time', () => {
    expect(recentExercises(catalog).map((exercise) => exercise.id)).toEqual(['2', '3']);
  });
});
