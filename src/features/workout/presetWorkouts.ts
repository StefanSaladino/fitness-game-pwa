import type { ExercisePickerItem } from './model';

export type PresetWorkoutId = 'FULL_BODY' | 'UPPER' | 'LOWER' | 'PUSH' | 'PULL';

export interface PresetSupersetDefinition {
  exerciseNames: readonly string[];
}

export interface PresetWorkout {
  id: PresetWorkoutId;
  name: string;
  description: string;
  exerciseNames: readonly string[];
  supersets?: readonly PresetSupersetDefinition[];
}

export interface ResolvedPresetWorkout {
  exerciseIds: string[];
  supersetGroups: string[][];
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
    supersets: [
      { exerciseNames: ['Cable Triceps Pushdown', 'Dumbbell Biceps Curl'] },
    ],
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
    supersets: [
      { exerciseNames: ['Cable Lateral Raise', 'Cable Triceps Pushdown'] },
    ],
  },
  {
    id: 'PULL',
    name: 'Pull',
    description: 'Back and biceps with vertical pulling, rowing, and rear-shoulder work.',
    exerciseNames: ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Pull-Up', 'Dumbbell Biceps Curl', 'Cable Face Pull'],
    supersets: [
      { exerciseNames: ['Dumbbell Biceps Curl', 'Cable Face Pull'] },
    ],
  },
] as const;

export function presetWorkoutById(id: PresetWorkoutId): PresetWorkout {
  const preset = presetWorkouts.find((candidate) => candidate.id === id);
  if (!preset) throw new Error('Preset workout not found.');
  return preset;
}

function canonicalKey(name: string): string {
  return name.toLocaleLowerCase('en-CA');
}

function supersetLabel(index: number): string {
  return index >= 0 && index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export function resolvePresetExerciseIds(preset: PresetWorkout, catalog: readonly ExercisePickerItem[]): string[] {
  const byName = new Map(catalog.map((exercise) => [canonicalKey(exercise.canonicalName), exercise]));
  return preset.exerciseNames.map((name) => {
    const exercise = byName.get(canonicalKey(name));
    if (!exercise) throw new Error(`${name} is unavailable in the active exercise catalogue.`);
    return exercise.id;
  });
}

export function resolvePresetWorkout(preset: PresetWorkout, catalog: readonly ExercisePickerItem[]): ResolvedPresetWorkout {
  const exerciseIds = resolvePresetExerciseIds(preset, catalog);
  const idByName = new Map(
    preset.exerciseNames.map((name, index) => [canonicalKey(name), exerciseIds[index]!]),
  );
  const seenMembers = new Set<string>();

  const supersetGroups = (preset.supersets ?? []).map((group) => {
    if (group.exerciseNames.length < 2) {
      throw new Error('Preset Supersets require at least two exercises.');
    }

    return group.exerciseNames.map((name) => {
      const key = canonicalKey(name);
      const exerciseId = idByName.get(key);
      if (!exerciseId) throw new Error(`${name} is not part of the preset exercise list.`);
      if (seenMembers.has(key)) throw new Error(`${name} belongs to more than one preset Superset.`);
      seenMembers.add(key);
      return exerciseId;
    });
  });

  return { exerciseIds, supersetGroups };
}

export function presetStructureSummary(preset: PresetWorkout): string {
  const groupByExercise = new Map<string, { index: number; group: PresetSupersetDefinition }>();
  (preset.supersets ?? []).forEach((group, index) => {
    group.exerciseNames.forEach((name) => groupByExercise.set(canonicalKey(name), { index, group }));
  });

  const renderedGroups = new Set<number>();
  const parts: string[] = [];

  for (const name of preset.exerciseNames) {
    const grouped = groupByExercise.get(canonicalKey(name));
    if (!grouped) {
      parts.push(name);
      continue;
    }
    if (renderedGroups.has(grouped.index)) continue;
    renderedGroups.add(grouped.index);
    parts.push(`Superset ${supersetLabel(grouped.index)}: ${grouped.group.exerciseNames.join(' + ')}`);
  }

  return parts.join(' · ');
}
