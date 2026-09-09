import type {
  BodyweightLoadMode,
  ExerciseMeasurementType,
  WorkoutSetType,
  WorkoutSetVariant,
} from './model';

export type WorkoutHistoryStatus = 'loading' | 'ready' | 'error';

export interface WorkoutHistorySetSegment {
  id: string;
  segmentIndex: number;
  weightKg: number | null;
  reps: number | null;
}

export interface WorkoutHistorySet {
  id: string;
  setNumber: number;
  setType: WorkoutSetType;
  setVariant: WorkoutSetVariant;
  weightKg: number | null;
  reps: number | null;
  bodyweightMode: BodyweightLoadMode | null;
  segments: WorkoutHistorySetSegment[];
}

export interface WorkoutHistoryExercise {
  id: string;
  exerciseId: string;
  canonicalName: string;
  measurementType: ExerciseMeasurementType;
  orderIndex: number;
  supersetGroupId: string | null;
  supersetOrder: number | null;
  sets: WorkoutHistorySet[];
}

export interface WorkoutHistorySession {
  id: string;
  scoringDate: string;
  startedAt: string;
  endedAt: string;
  activeDurationSeconds: number;
  exercises: WorkoutHistoryExercise[];
}

export type WorkoutHistoryBlock =
  | {
      kind: 'exercise';
      exercise: WorkoutHistoryExercise;
    }
  | {
      kind: 'superset';
      groupId: string;
      label: string;
      exercises: WorkoutHistoryExercise[];
    };

function alphaLabel(index: number): string {
  return index >= 0 && index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export function buildWorkoutHistoryBlocks(exercises: WorkoutHistoryExercise[]): WorkoutHistoryBlock[] {
  const ordered = [...exercises].sort((left, right) => left.orderIndex - right.orderIndex);
  const membersByGroup = new Map<string, WorkoutHistoryExercise[]>();

  for (const exercise of ordered) {
    if (!exercise.supersetGroupId || exercise.supersetOrder === null) continue;
    const members = membersByGroup.get(exercise.supersetGroupId) ?? [];
    members.push(exercise);
    membersByGroup.set(exercise.supersetGroupId, members);
  }

  const validGroups = [...membersByGroup.entries()]
    .map(([groupId, members]) => ({
      groupId,
      members: [...members].sort(
        (left, right) =>
          (left.supersetOrder ?? Number.MAX_SAFE_INTEGER) - (right.supersetOrder ?? Number.MAX_SAFE_INTEGER)
          || left.orderIndex - right.orderIndex,
      ),
      firstOrderIndex: Math.min(...members.map((member) => member.orderIndex)),
    }))
    .filter(({ members }) => members.length >= 2)
    .sort((left, right) => left.firstOrderIndex - right.firstOrderIndex);

  const labelByGroup = new Map(validGroups.map((group, index) => [group.groupId, alphaLabel(index)]));
  const validMembersByGroup = new Map(validGroups.map((group) => [group.groupId, group.members]));
  const renderedGroups = new Set<string>();
  const blocks: WorkoutHistoryBlock[] = [];

  for (const exercise of ordered) {
    const groupId = exercise.supersetGroupId;
    const members = groupId ? validMembersByGroup.get(groupId) : undefined;

    if (!groupId || !members) {
      blocks.push({ kind: 'exercise', exercise });
      continue;
    }

    if (renderedGroups.has(groupId)) continue;
    renderedGroups.add(groupId);

    blocks.push({
      kind: 'superset',
      groupId,
      label: labelByGroup.get(groupId) ?? String(blocks.length + 1),
      exercises: members,
    });
  }

  return blocks;
}
