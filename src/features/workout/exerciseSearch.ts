import type { ExerciseBrowseMode, ExerciseMuscleGroup, ExercisePickerItem, ExerciseWorkoutType } from './model';

export const MUSCLE_GROUP_LABELS: Record<ExerciseMuscleGroup, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders', BICEPS: 'Biceps', TRICEPS: 'Triceps',
  QUADS: 'Quads', HAMSTRINGS: 'Hamstrings', GLUTES: 'Glutes', CALVES: 'Calves', CORE: 'Core',
  FOREARMS_GRIP: 'Forearms / grip', NECK: 'Neck', FULL_BODY: 'Full body', OTHER: 'Other',
};

export const WORKOUT_TYPE_LABELS: Record<ExerciseWorkoutType, string> = {
  BARBELL: 'Barbell', DUMBBELL: 'Dumbbell', KETTLEBELL: 'Kettlebell', MACHINE: 'Machine / Smith',
  CABLE: 'Cable', BODYWEIGHT: 'Bodyweight', ISOMETRIC: 'Isometric', PLYOMETRIC: 'Plyometric',
  MEDICINE_BALL: 'Medicine ball', LANDMINE: 'Landmine', BAND: 'Bands',
  STRONGMAN_CARRY_SLED: 'Strongman / carries / sleds', OLYMPIC_POWER: 'Olympic / power',
  SPECIALTY: 'Specialty / accessory', OTHER: 'Other',
};

export const MUSCLE_GROUP_ORDER = Object.keys(MUSCLE_GROUP_LABELS) as ExerciseMuscleGroup[];
export const WORKOUT_TYPE_ORDER = Object.keys(WORKOUT_TYPE_LABELS) as ExerciseWorkoutType[];

export interface ExerciseSearchFilters {
  query: string;
  muscleGroup: ExerciseMuscleGroup | '';
  workoutType: ExerciseWorkoutType | '';
}

export interface ExerciseResultGroup {
  key: string;
  label: string;
  exercises: ExercisePickerItem[];
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function tokenMatches(queryToken: string, candidateToken: string): boolean {
  if (candidateToken === queryToken || candidateToken.startsWith(queryToken)) return true;
  const maxDistance = queryToken.length <= 4 ? 1 : queryToken.length <= 8 ? 2 : 3;
  return levenshtein(queryToken, candidateToken) <= maxDistance;
}

function relevance(item: ExercisePickerItem, rawQuery: string): number | null {
  const query = normalize(rawQuery);
  if (!query) return 100;
  const candidates = [item.canonicalName, ...item.aliases].map(normalize).filter(Boolean);
  for (const candidate of candidates) if (candidate === query) return 0;
  for (const candidate of candidates) if (candidate.startsWith(query)) return 5;
  for (const candidate of candidates) if (candidate.includes(query)) return 10;

  const queryTokens = query.split(' ');
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const candidateTokens = candidate.split(' ');
    if (queryTokens.every((queryToken) => candidateTokens.some((candidateToken) => tokenMatches(queryToken, candidateToken)))) {
      best = Math.min(best, 20 + Math.abs(candidateTokens.length - queryTokens.length));
    }
    const distance = levenshtein(query, candidate);
    const threshold = Math.max(1, Math.floor(Math.max(query.length, candidate.length) * 0.24));
    if (distance <= threshold) best = Math.min(best, 30 + distance);
  }
  return Number.isFinite(best) ? best : null;
}

export function filterAndRankExercises(items: ExercisePickerItem[], filters: ExerciseSearchFilters): ExercisePickerItem[] {
  return items
    .map((item) => ({ item, score: relevance(item, filters.query) }))
    .filter(({ item, score }) => score !== null
      && (!filters.muscleGroup || item.primaryMuscleGroup === filters.muscleGroup)
      && (!filters.workoutType || item.workoutType === filters.workoutType))
    .sort((a, b) => {
      if (a.score !== b.score) return (a.score ?? 999) - (b.score ?? 999);
      if (!filters.query) {
        const aRecent = a.item.lastUsedAt ? Date.parse(a.item.lastUsedAt) : 0;
        const bRecent = b.item.lastUsedAt ? Date.parse(b.item.lastUsedAt) : 0;
        if (aRecent !== bRecent) return bRecent - aRecent;
      }
      return a.item.canonicalName.localeCompare(b.item.canonicalName);
    })
    .map(({ item }) => item);
}

export function recentExercises(items: ExercisePickerItem[], limit = 8): ExercisePickerItem[] {
  return items
    .filter((item) => item.lastUsedAt)
    .sort((a, b) => Date.parse(b.lastUsedAt!) - Date.parse(a.lastUsedAt!))
    .slice(0, limit);
}

export function groupExercises(items: ExercisePickerItem[], mode: ExerciseBrowseMode): ExerciseResultGroup[] {
  if (mode === 'muscle') {
    return MUSCLE_GROUP_ORDER
      .map((key) => ({ key, label: MUSCLE_GROUP_LABELS[key], exercises: items.filter((item) => item.primaryMuscleGroup === key) }))
      .filter((group) => group.exercises.length > 0);
  }
  return WORKOUT_TYPE_ORDER
    .map((key) => ({ key, label: WORKOUT_TYPE_LABELS[key], exercises: items.filter((item) => item.workoutType === key) }))
    .filter((group) => group.exercises.length > 0);
}
