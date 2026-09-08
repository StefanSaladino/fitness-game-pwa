import { describe, expect, it } from 'vitest';
import type { ExercisePickerItem } from './model';
import {
  presetStructureSummary,
  presetWorkoutById,
  presetWorkouts,
  resolvePresetExerciseIds,
  resolvePresetWorkout,
} from './presetWorkouts';

function exercise(id: string, canonicalName: string): ExercisePickerItem {
  return {
    id,
    canonicalName,
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'OTHER',
    workoutType: 'OTHER',
    aliases: [],
    lastUsedAt: null,
  };
}

describe('preset workouts', () => {
  it('defines five bounded presets with unique exercise names', () => {
    expect(presetWorkouts.map((preset) => preset.id)).toEqual(['FULL_BODY', 'UPPER', 'LOWER', 'PUSH', 'PULL']);
    for (const preset of presetWorkouts) {
      expect(preset.exerciseNames.length).toBeGreaterThanOrEqual(5);
      expect(preset.exerciseNames.length).toBeLessThanOrEqual(6);
      expect(new Set(preset.exerciseNames).size).toBe(preset.exerciseNames.length);
    }
  });

  it('resolves canonical names to active catalogue ids in preset order', () => {
    const preset = presetWorkoutById('PUSH');
    const catalog = preset.exerciseNames.map((name, index) => exercise(`e-${index + 1}`, name));
    expect(resolvePresetExerciseIds(preset, catalog)).toEqual(['e-1', 'e-2', 'e-3', 'e-4', 'e-5']);
  });

  it('resolves optional Superset definitions to the same canonical exercise ids', () => {
    const preset = presetWorkoutById('PUSH');
    const catalog = preset.exerciseNames.map((name, index) => exercise(`e-${index + 1}`, name));

    expect(resolvePresetWorkout(preset, catalog)).toEqual({
      exerciseIds: ['e-1', 'e-2', 'e-3', 'e-4', 'e-5'],
      supersetGroups: [['e-4', 'e-5']],
    });
    expect(presetStructureSummary(preset)).toContain('Superset A: Cable Lateral Raise + Cable Triceps Pushdown');
  });

  it('keeps ordinary presets valid with no Superset groups', () => {
    const preset = presetWorkoutById('FULL_BODY');
    const catalog = preset.exerciseNames.map((name, index) => exercise(`e-${index + 1}`, name));
    expect(resolvePresetWorkout(preset, catalog).supersetGroups).toEqual([]);
  });

  it('fails closed when a required canonical exercise is unavailable', () => {
    const preset = presetWorkoutById('FULL_BODY');
    const catalog = preset.exerciseNames.slice(0, -1).map((name, index) => exercise(`e-${index + 1}`, name));
    expect(() => resolvePresetExerciseIds(preset, catalog)).toThrow(/unavailable in the active exercise catalogue/);
  });
});
