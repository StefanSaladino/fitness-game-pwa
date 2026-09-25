import type {
  TrainingProgramExercisePrescription,
  TrainingProgramTargetMuscleGroup,
} from './trainingProgram';
import type {
  TrainingProgramGeneratorCandidate,
  TrainingProgramVolumeAction,
} from './trainingProgramGenerator';

export type TrainingProgramVolumeDirection = 'ADD' | 'REMOVE';

export type TrainingProgramVolumePerformanceTrend =
  | 'IMPROVING'
  | 'DECLINING'
  | 'STABLE'
  | 'PLATEAU'
  | 'VARIABLE'
  | 'RECOVERING'
  | 'REGRESSING'
  | 'INSUFFICIENT_DATA';

export interface TrainingProgramVolumeGuidance {
  muscleGroup: TrainingProgramTargetMuscleGroup;
  action: TrainingProgramVolumeAction;
  effectiveSets: number;
  targetMin: number;
  targetMax: number;
  highReviewAbove: number;
  volumeEvidenceLimited: boolean;
  performanceTrend: TrainingProgramVolumePerformanceTrend;
}

export type TrainingProgramVolumeExercise = TrainingProgramExercisePrescription;

export interface TrainingProgramVolumeOverride {
  exerciseId: string;
  workingSets: number;
}

export interface TrainingProgramVolumeWarning {
  muscleGroup: TrainingProgramTargetMuscleGroup;
  tone: 'CAUTION' | 'HIGH';
  title: string;
  message: string;
  currentEffectiveSets: number;
  projectedEffectiveSets: number;
  targetMin: number;
  targetMax: number;
}

export interface TrainingProgramVolumeAdjustment {
  direction: TrainingProgramVolumeDirection;
  currentTotalWorkingSets: number;
  nextTotalWorkingSets: number;
  changedExerciseId: string;
  changedExerciseName: string;
  overrides: TrainingProgramVolumeOverride[];
  warnings: TrainingProgramVolumeWarning[];
}

export function totalTrainingProgramWorkingSets(
  exercises: readonly TrainingProgramVolumeExercise[],
): number {
  return exercises.reduce(
    (sum, exercise) => sum + exercise.workingSets,
    0,
  );
}

function actionPriority(
  action: TrainingProgramVolumeAction | undefined,
  direction: TrainingProgramVolumeDirection,
): number {
  if (direction === 'ADD') {
    switch (action) {
      case 'ADD_VOLUME_CAUTIOUSLY': return 120;
      case 'MAINTAIN': return 45;
      case 'MONITOR': return 20;
      case 'NO_ACTION': return 0;
      case 'HOLD_AND_REVIEW': return -55;
      case 'REDUCE_VOLUME_CAUTIOUSLY': return -130;
      default: return 0;
    }
  }

  switch (action) {
    case 'REDUCE_VOLUME_CAUTIOUSLY': return 120;
    case 'HOLD_AND_REVIEW': return 70;
    case 'MONITOR': return 25;
    case 'NO_ACTION': return 10;
    case 'MAINTAIN': return -15;
    case 'ADD_VOLUME_CAUTIOUSLY': return -130;
    default: return 0;
  }
}

function guidanceMap(
  rows: readonly TrainingProgramVolumeGuidance[],
): Map<TrainingProgramTargetMuscleGroup, TrainingProgramVolumeGuidance> {
  return new Map(rows.map((row) => [row.muscleGroup, row]));
}

function candidateMap(
  candidates: readonly TrainingProgramGeneratorCandidate[],
): Map<string, TrainingProgramGeneratorCandidate> {
  return new Map(candidates.map((candidate) => [
    candidate.exerciseId,
    candidate,
  ]));
}

function selectionScore(
  exercise: TrainingProgramVolumeExercise,
  guidance: TrainingProgramVolumeGuidance | undefined,
  direction: TrainingProgramVolumeDirection,
): number {
  const rangeHeadroom = direction === 'ADD'
    ? 8 - exercise.workingSets
    : exercise.workingSets - 1;

  return actionPriority(guidance?.action, direction)
    + (exercise.targetContributionRole === 'DIRECT' ? 15 : 0)
    + (
      direction === 'REMOVE' && exercise.selectionIntent === 'ACCESSORY'
        ? 12
        : 0
    )
    + rangeHeadroom * 2;
}

function contributionRows(
  exercise: TrainingProgramVolumeExercise,
  candidates: Map<string, TrainingProgramGeneratorCandidate>,
): Array<{
  muscleGroup: TrainingProgramTargetMuscleGroup;
  weight: number;
}> {
  const candidate = candidates.get(exercise.exerciseId);
  if (!candidate) {
    return [{
      muscleGroup: exercise.targetMuscleGroup,
      weight: 1,
    }];
  }

  const mapped = candidate.contributions.flatMap((contribution) => {
    if (
      typeof contribution.muscleGroup !== 'string'
      || !Number.isFinite(contribution.weight)
      || contribution.weight <= 0
    ) {
      return [];
    }

    return [{
      muscleGroup:
        contribution.muscleGroup as TrainingProgramTargetMuscleGroup,
      weight: contribution.weight,
    }];
  });

  return mapped.length > 0
    ? mapped
    : [{
        muscleGroup: exercise.targetMuscleGroup,
        weight: 1,
      }];
}

function plannedContributionByMuscle(
  exercises: readonly TrainingProgramVolumeExercise[],
  candidates: Map<string, TrainingProgramGeneratorCandidate>,
): Map<TrainingProgramTargetMuscleGroup, number> {
  const result = new Map<TrainingProgramTargetMuscleGroup, number>();

  for (const exercise of exercises) {
    for (const contribution of contributionRows(exercise, candidates)) {
      result.set(
        contribution.muscleGroup,
        (result.get(contribution.muscleGroup) ?? 0)
          + exercise.workingSets * contribution.weight,
      );
    }
  }

  return result;
}

function affectedMuscles(
  exercise: TrainingProgramVolumeExercise,
  candidates: Map<string, TrainingProgramGeneratorCandidate>,
): Set<TrainingProgramTargetMuscleGroup> {
  return new Set(
    contributionRows(exercise, candidates)
      .map((contribution) => contribution.muscleGroup),
  );
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function warningsFor(
  direction: TrainingProgramVolumeDirection,
  changedExercise: TrainingProgramVolumeExercise,
  proposedExercises: readonly TrainingProgramVolumeExercise[],
  candidates: Map<string, TrainingProgramGeneratorCandidate>,
  guidanceRows: readonly TrainingProgramVolumeGuidance[],
): TrainingProgramVolumeWarning[] {
  const guidance = guidanceMap(guidanceRows);
  const planned = plannedContributionByMuscle(proposedExercises, candidates);
  const affected = affectedMuscles(changedExercise, candidates);
  const warnings: TrainingProgramVolumeWarning[] = [];

  for (const muscleGroup of affected) {
    const row = guidance.get(muscleGroup);
    if (!row || row.volumeEvidenceLimited) continue;

    const projected = row.effectiveSets + (planned.get(muscleGroup) ?? 0);
    const projectedBelow = projected < row.targetMin;
    const projectedAbove = projected > row.targetMax;

    if (
      direction === 'REMOVE'
      && (
        row.action === 'ADD_VOLUME_CAUTIOUSLY'
        || (row.action === 'MAINTAIN' && projectedBelow)
      )
    ) {
      warnings.push({
        muscleGroup,
        tone: 'CAUTION',
        title: 'Lower than the current recommendation',
        message:
          row.action === 'ADD_VOLUME_CAUTIOUSLY'
            ? 'This removes planned work from a muscle where the current performance-aware signal supports cautiously adding volume. You can still continue, but the edit moves against the current recommendation.'
            : 'This edit is projected to move the next training exposure below the current target range. You can still continue if the lower workload is intentional.',
        currentEffectiveSets: rounded(row.effectiveSets),
        projectedEffectiveSets: rounded(projected),
        targetMin: rounded(row.targetMin),
        targetMax: rounded(row.targetMax),
      });
    }

    const negativeTrend =
      row.performanceTrend === 'DECLINING'
      || row.performanceTrend === 'REGRESSING'
      || row.performanceTrend === 'PLATEAU';
    const holdAgainstAdding =
      row.action === 'HOLD_AND_REVIEW'
      && (
        row.performanceTrend === 'DECLINING'
        || row.performanceTrend === 'REGRESSING'
      );

    if (
      direction === 'ADD'
      && (
        row.action === 'REDUCE_VOLUME_CAUTIOUSLY'
        || holdAgainstAdding
        || (row.action === 'HOLD_AND_REVIEW' && projectedAbove)
        || (row.action === 'MAINTAIN' && projectedAbove)
      )
    ) {
      warnings.push({
        muscleGroup,
        tone:
          (row.action === 'REDUCE_VOLUME_CAUTIOUSLY' && negativeTrend)
          || holdAgainstAdding
            ? 'HIGH'
            : 'CAUTION',
        title:
          row.action === 'REDUCE_VOLUME_CAUTIOUSLY' && negativeTrend
            ? 'Current data supports less volume'
            : holdAgainstAdding
              ? 'Current trend says hold before adding work'
              : 'Higher than the current recommendation',
        message:
          row.action === 'REDUCE_VOLUME_CAUTIOUSLY' && negativeTrend
            ? 'Recent performance is not moving positively and the current evidence supports trimming volume. Adding more work may make recovery harder and may reinforce the negative performance trend.'
            : holdAgainstAdding
              ? 'Recent performance is declining or regressing, so Top Set currently supports holding and reviewing rather than adding volume. More work may make recovery harder even if the raw volume number is not above target.'
              : 'This edit is projected to push the next training exposure above the current target range. Top Set does not currently have evidence supporting the extra work.',
        currentEffectiveSets: rounded(row.effectiveSets),
        projectedEffectiveSets: rounded(projected),
        targetMin: rounded(row.targetMin),
        targetMax: rounded(row.targetMax),
      });
    }
  }

  return warnings.sort((left, right) => {
    if (left.tone !== right.tone) return left.tone === 'HIGH' ? -1 : 1;
    return left.muscleGroup.localeCompare(right.muscleGroup);
  });
}

export function buildTrainingProgramVolumeAdjustment({
  exercises,
  candidates,
  guidance,
  direction,
}: {
  exercises: readonly TrainingProgramVolumeExercise[];
  candidates: readonly TrainingProgramGeneratorCandidate[];
  guidance: readonly TrainingProgramVolumeGuidance[];
  direction: TrainingProgramVolumeDirection;
}): TrainingProgramVolumeAdjustment | null {
  if (exercises.length === 0) return null;

  const byGuidance = guidanceMap(guidance);
  const eligible = exercises
    .filter((exercise) =>
      direction === 'ADD'
        ? exercise.workingSets < 8
        : exercise.workingSets > 1)
    .map((exercise) => ({
      exercise,
      score: selectionScore(
        exercise,
        byGuidance.get(exercise.targetMuscleGroup),
        direction,
      ),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      const name = left.exercise.canonicalName.localeCompare(
        right.exercise.canonicalName,
        'en-CA',
      );
      return name !== 0
        ? name
        : left.exercise.exerciseId.localeCompare(right.exercise.exerciseId);
    });

  const winner = eligible[0]?.exercise;
  if (!winner) return null;

  const delta = direction === 'ADD' ? 1 : -1;
  const proposed = exercises.map((exercise) =>
    exercise.exerciseId === winner.exerciseId
      ? { ...exercise, workingSets: exercise.workingSets + delta }
      : { ...exercise });

  const candidatesById = candidateMap(candidates);
  const warnings = warningsFor(
    direction,
    winner,
    proposed,
    candidatesById,
    guidance,
  );

  return {
    direction,
    currentTotalWorkingSets: totalTrainingProgramWorkingSets(exercises),
    nextTotalWorkingSets: totalTrainingProgramWorkingSets(proposed),
    changedExerciseId: winner.exerciseId,
    changedExerciseName: winner.canonicalName,
    overrides: [{
      exerciseId: winner.exerciseId,
      workingSets: winner.workingSets + delta,
    }],
    warnings,
  };
}
