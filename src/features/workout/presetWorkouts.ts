import type { ExercisePickerItem } from './model';

export type PresetWorkoutId = 'FULL_BODY' | 'UPPER' | 'LOWER' | 'PUSH' | 'PULL';

export interface PresetWorkout {
  id: PresetWorkoutId;
  name: string;
  description: string;
  exerciseNames: readonly string[];
}

export const presetWorkouts: readonly PresetWorkout[] = [
  {
    id: 'FULL_BODY',
    name: 'Full Body Strength',
    description: 'A balanced barbell-and-dumbbell session covering the main movement patterns.',
    exerciseNames: ['Back Squat', 'Barbell Bench Press', 'Barbell Row', 'Romanian Deadlift', 'Dumbbell Shoulder Press'],
  },
  {
    id: 'UPPER',
    name: 'Upper Strength',
    description: 'Horizontal and vertical pressing and pulling with simple arm accessories.',
    exerciseNames: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Cable Triceps Pushdown', 'Dumbbell Biceps Curl'],
  },
  {
    id: 'LOWER',
    name: 'Lower Strength',
    description: 'Squat, hinge, glute, hamstring, and calf work in one lower-body session.',
    exerciseNames: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Barbell Hip Thrust', 'Lying Leg Curl', 'Calf Raise'],
  },
  {
    id: 'PUSH',
    name: 'Push',
    description: 'Chest, shoulders, and triceps with a mix of compound and accessory work.',
    exerciseNames: ['Barbell Bench Press', 'Overhead Press', 'Dumbbell Shoulder Press', 'Cable Lateral Raise', 'Cable Triceps Pushdown'],
  },
  {
    id: 'PULL',
    name: 'Pull',
    description: 'Back and biceps with vertical pulling, rowing, and rear-shoulder work.',
    exerciseNames: ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Pull-Up', 'Dumbbell Biceps Curl', 'Cable Face Pull'],
  },
] as const;

export function presetWorkoutById(id: PresetWorkoutId): PresetWorkout {
  const preset = presetWorkouts.find((candidate) => candidate.id === id);
  if (!preset) throw new Error('Preset workout not found.');
  return preset;
}

export function resolvePresetExerciseIds(preset: PresetWorkout, catalog: readonly ExercisePickerItem[]): string[] {
  const byName = new Map(catalog.map((exercise) => [exercise.canonicalName.toLocaleLowerCase('en-CA'), exercise]));
  return preset.exerciseNames.map((name) => {
    const exercise = byName.get(name.toLocaleLowerCase('en-CA'));
    if (!exercise) throw new Error(`${name} is unavailable in the active exercise catalogue.`);
    return exercise.id;
  });
}
