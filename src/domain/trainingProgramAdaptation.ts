import {
  TRAINING_PROGRAM_MAX_REPS,
  type TrainingProgramBodyweightMode,
  type TrainingProgramMeasurementType,
  type TrainingProgramTargetContributionRole,
  type TrainingProgramTargetMuscleGroup,
} from './trainingProgram';
import type { TrainingProgramVolumeAction } from './trainingProgramGenerator';

export const TRAINING_PROGRAM_ADAPTATION_VERSION =
  'training-program-adaptation-v1' as const;

export type TrainingProgramAdaptationSummaryReasonCode =
  | 'LOAD_ESTABLISHED'
  | 'LOAD_PROGRESSED'
  | 'BODYWEIGHT_REPS_PROGRESSED'
  | 'VOLUME_ADDED'
  | 'VOLUME_REDUCED'
  | 'HOLD_INCOMPLETE_SETS'
  | 'HOLD_ADVANCED_SET_EDIT'
  | 'HOLD_REPS_BELOW_TOP'
  | 'HOLD_NO_MATCHING_FUTURE_EXERCISE'
  | 'HOLD_PHASE19_MONITOR'
  | 'HOLD_PHASE19_MAINTAIN'
  | 'HOLD_PHASE19_SMALL_CHANGE'
  | 'HOLD_CONSTRAINT_EXCLUDED'
  | 'HOLD_UNSUPPORTED_LOAD_MODE'
  | 'HOLD_NO_ADAPTIVE_SIGNAL';

export type TrainingProgramAdaptationChangeReasonCode =
  | 'ESTABLISH_LOAD_FROM_COMPLETED_SETS'
  | 'PROGRESS_LOAD_TOP_OF_RANGE'
  | 'PROGRESS_BODYWEIGHT_REPS'
  | 'ADD_VOLUME_PHASE19'
  | 'REDUCE_VOLUME_PHASE19';

export type TrainingProgramAdaptationField =
  | 'TARGET_WEIGHT_KG'
  | 'WORKING_SETS'
  | 'REPS_MIN'
  | 'REPS_MAX';

export interface TrainingProgramAdaptationActualExerciseEvidence {
  exerciseId: string;
  canonicalName: string;
  measurementType: TrainingProgramMeasurementType;
  plannedWorkingSets: number | null;
  standardWorkingSetCount: number;
  nonstandardCompletedSetCount: number;
  minCompletedReps: number | null;
  maxCompletedReps: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  plainBodyweightSetCount: number;
  addedWeightSetCount: number;
  assistedSetCount: number;
}

export interface TrainingProgramAdaptationFutureExercise {
  programExerciseId: string;
  programWorkoutId: string;
  scheduledDate: string;
  exerciseId: string;
  canonicalName: string;
  targetMuscleGroup: TrainingProgramTargetMuscleGroup;
  targetContributionRole: TrainingProgramTargetContributionRole;
  selectionIntent: 'COMPOUND' | 'ACCESSORY';
  measurementType: TrainingProgramMeasurementType;
  workingSets: number;
  repsMin: number;
  repsMax: number;
  targetWeightKg: number | null;
  bodyweightMode: TrainingProgramBodyweightMode | null;
  orderIndex: number;
  currentlyExcluded: boolean;
}

export interface ExistingTrainingProgramAdaptation {
  adaptationId: string;
  outcome: 'APPLIED' | 'NO_CHANGE';
  sourceProgramRevision: number;
  resultingProgramRevision: number;
  reasonCodes: TrainingProgramAdaptationSummaryReasonCode[];
}

export interface TrainingProgramAdaptationContext {
  programId: string;
  programRevision: number;
  triggerProgramWorkoutId: string;
  triggerWorkoutSessionId: string;
  triggerScheduledDate: string;
  triggerScoringDate: string;
  triggerExecutionStatus:
    | 'COMPLETED_PROGRAMMED'
    | 'COMPLETED_OWN_WORKOUT';
  alreadyAdapted: boolean;
  existingAdaptation: ExistingTrainingProgramAdaptation | null;
  actualExercises: TrainingProgramAdaptationActualExerciseEvidence[];
  futureExercises: TrainingProgramAdaptationFutureExercise[];
}

export interface TrainingProgramAdaptationVolumeSignal {
  muscleGroup: TrainingProgramTargetMuscleGroup;
  action: TrainingProgramVolumeAction;
  suggestedEffectiveSetChange: number | null;
  volumeStatus: string;
  performanceTrend: string;
  performancePersistence: string;
  performanceConfidence: string;
}

export interface TrainingProgramAdaptationChange {
  programExerciseId: string;
  field: TrainingProgramAdaptationField;
  oldValue: number | null;
  newValue: number;
  reasonCode: TrainingProgramAdaptationChangeReasonCode;
}

export interface TrainingProgramAdaptationEvidenceSnapshot {
  policyVersion: typeof TRAINING_PROGRAM_ADAPTATION_VERSION;
  triggerProgramWorkoutId: string;
  triggerWorkoutSessionId: string;
  triggerScheduledDate: string;
  triggerScoringDate: string;
  actualExercises: TrainingProgramAdaptationActualExerciseEvidence[];
  phase19Signals: TrainingProgramAdaptationVolumeSignal[];
  generatedChangeCount: number;
}

export interface TrainingProgramAdaptationPlan {
  policyVersion: typeof TRAINING_PROGRAM_ADAPTATION_VERSION;
  reasonCodes: TrainingProgramAdaptationSummaryReasonCode[];
  changes: TrainingProgramAdaptationChange[];
  evidenceSnapshot: TrainingProgramAdaptationEvidenceSnapshot;
}

const MAX_CHANGE_ROWS = 64;
const MAX_VOLUME_PRESCRIPTION_CHANGES_PER_SIGNAL = 2;

function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

function progressedWeight(baseWeightKg: number): number | null {
  if (!Number.isFinite(baseWeightKg) || baseWeightKg <= 0) return null;

  const cap = baseWeightKg * 1.10;
  let next = roundToQuarter(baseWeightKg * 1.025);

  if (next <= baseWeightKg) {
    next = roundToQuarter(baseWeightKg + 0.25);
  }

  if (next <= baseWeightKg || next > cap + 1e-9) {
    return null;
  }

  return Math.round(next * 100) / 100;
}

function futureOrder(
  left: TrainingProgramAdaptationFutureExercise,
  right: TrainingProgramAdaptationFutureExercise,
): number {
  const date = left.scheduledDate.localeCompare(right.scheduledDate);
  if (date !== 0) return date;

  if (left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }

  return left.programExerciseId.localeCompare(right.programExerciseId);
}

function actualOrder(
  left: TrainingProgramAdaptationActualExerciseEvidence,
  right: TrainingProgramAdaptationActualExerciseEvidence,
): number {
  const name = left.canonicalName.localeCompare(
    right.canonicalName,
    'en-CA',
  );
  return name !== 0
    ? name
    : left.exerciseId.localeCompare(right.exerciseId);
}

function uniqueReasons(
  values: TrainingProgramAdaptationSummaryReasonCode[],
): TrainingProgramAdaptationSummaryReasonCode[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right)
  );
}

function appliedReasonFor(
  reason: TrainingProgramAdaptationChangeReasonCode,
): TrainingProgramAdaptationSummaryReasonCode {
  switch (reason) {
    case 'ESTABLISH_LOAD_FROM_COMPLETED_SETS':
      return 'LOAD_ESTABLISHED';
    case 'PROGRESS_LOAD_TOP_OF_RANGE':
      return 'LOAD_PROGRESSED';
    case 'PROGRESS_BODYWEIGHT_REPS':
      return 'BODYWEIGHT_REPS_PROGRESSED';
    case 'ADD_VOLUME_PHASE19':
      return 'VOLUME_ADDED';
    case 'REDUCE_VOLUME_PHASE19':
      return 'VOLUME_REDUCED';
  }
}

function validPositiveNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function matchingFutureRows(
  context: TrainingProgramAdaptationContext,
  exerciseId: string,
): TrainingProgramAdaptationFutureExercise[] {
  return context.futureExercises
    .filter((future) => future.exerciseId === exerciseId)
    .sort(futureOrder);
}

export function buildTrainingProgramAdaptationPlan(
  context: TrainingProgramAdaptationContext,
  volumeSignals: readonly TrainingProgramAdaptationVolumeSignal[],
): TrainingProgramAdaptationPlan {
  if (context.alreadyAdapted) {
    throw new Error(
      'A completed workout that already has an adaptation cannot be planned again.',
    );
  }

  const changes: TrainingProgramAdaptationChange[] = [];
  const holdReasons: TrainingProgramAdaptationSummaryReasonCode[] = [];
  const changedFields = new Set<string>();
  const changedExercises = new Set<string>();

  const canAdd = (count = 1): boolean =>
    changes.length + count <= MAX_CHANGE_ROWS;

  const addChange = (
    change: TrainingProgramAdaptationChange,
  ): boolean => {
    const key = `${change.programExerciseId}:${change.field}`;
    if (changedFields.has(key) || !canAdd()) return false;

    changes.push(change);
    changedFields.add(key);
    changedExercises.add(change.programExerciseId);
    return true;
  };

  for (const actual of [...context.actualExercises].sort(actualOrder)) {
    const futureRows = matchingFutureRows(context, actual.exerciseId);

    if (futureRows.length === 0) {
      holdReasons.push('HOLD_NO_MATCHING_FUTURE_EXERCISE');
      continue;
    }

    const eligibleFutureRows = futureRows.filter(
      (future) => !future.currentlyExcluded,
    );

    if (eligibleFutureRows.length === 0) {
      holdReasons.push('HOLD_CONSTRAINT_EXCLUDED');
      continue;
    }

    const requiredSets = Math.max(1, actual.plannedWorkingSets ?? 2);

    if (actual.nonstandardCompletedSetCount > 0) {
      holdReasons.push('HOLD_ADVANCED_SET_EDIT');
      continue;
    }

    if (actual.standardWorkingSetCount < requiredSets) {
      holdReasons.push('HOLD_INCOMPLETE_SETS');
      continue;
    }

    if (actual.measurementType === 'WEIGHT_REPS') {
      if (
        !validPositiveNumber(actual.minWeightKg)
        || actual.minCompletedReps === null
      ) {
        holdReasons.push('HOLD_INCOMPLETE_SETS');
        continue;
      }

      let generated = false;

      for (const future of eligibleFutureRows) {
        if (!canAdd()) break;
        if (future.measurementType !== 'WEIGHT_REPS') continue;

        if (future.targetWeightKg === null) {
          if (actual.minCompletedReps < future.repsMin) continue;

          generated = addChange({
            programExerciseId: future.programExerciseId,
            field: 'TARGET_WEIGHT_KG',
            oldValue: null,
            newValue: actual.minWeightKg,
            reasonCode: 'ESTABLISH_LOAD_FROM_COMPLETED_SETS',
          }) || generated;
          continue;
        }

        if (
          actual.minCompletedReps < future.repsMax
          || actual.minWeightKg < future.targetWeightKg
        ) {
          continue;
        }

        const nextWeight = progressedWeight(
          Math.max(future.targetWeightKg, actual.minWeightKg),
        );

        if (nextWeight === null) continue;

        generated = addChange({
          programExerciseId: future.programExerciseId,
          field: 'TARGET_WEIGHT_KG',
          oldValue: future.targetWeightKg,
          newValue: nextWeight,
          reasonCode: 'PROGRESS_LOAD_TOP_OF_RANGE',
        }) || generated;
      }

      if (!generated) {
        holdReasons.push('HOLD_REPS_BELOW_TOP');
      }

      continue;
    }

    if (actual.measurementType === 'BODYWEIGHT_REPS') {
      const bodyweightFutureRows = eligibleFutureRows.filter(
        (future) =>
          future.measurementType === 'BODYWEIGHT_REPS'
          && future.bodyweightMode === 'BODYWEIGHT',
      );

      if (bodyweightFutureRows.length === 0) {
        holdReasons.push('HOLD_UNSUPPORTED_LOAD_MODE');
        continue;
      }

      if (
        actual.plainBodyweightSetCount < requiredSets
        || actual.minCompletedReps === null
      ) {
        holdReasons.push('HOLD_INCOMPLETE_SETS');
        continue;
      }

      let generated = false;

      for (const future of bodyweightFutureRows) {
        if (!canAdd(2)) break;

        if (
          actual.minCompletedReps < future.repsMax
          || future.repsMax >= TRAINING_PROGRAM_MAX_REPS
          || future.repsMin >= TRAINING_PROGRAM_MAX_REPS
        ) {
          continue;
        }

        const minAdded = addChange({
          programExerciseId: future.programExerciseId,
          field: 'REPS_MIN',
          oldValue: future.repsMin,
          newValue: future.repsMin + 1,
          reasonCode: 'PROGRESS_BODYWEIGHT_REPS',
        });

        const maxAdded = addChange({
          programExerciseId: future.programExerciseId,
          field: 'REPS_MAX',
          oldValue: future.repsMax,
          newValue: future.repsMax + 1,
          reasonCode: 'PROGRESS_BODYWEIGHT_REPS',
        });

        if (minAdded !== maxAdded) {
          throw new Error(
            'Bodyweight progression must remain an atomic rep-range pair.',
          );
        }

        generated = generated || (minAdded && maxAdded);
      }

      if (!generated) {
        holdReasons.push('HOLD_REPS_BELOW_TOP');
      }
    }
  }

  const sortedSignals = [...volumeSignals].sort((left, right) =>
    left.muscleGroup.localeCompare(right.muscleGroup)
  );

  for (const signal of sortedSignals) {
    if (signal.action === 'MAINTAIN') {
      holdReasons.push('HOLD_PHASE19_MAINTAIN');
      continue;
    }

    if (
      signal.action === 'NO_ACTION'
      || signal.action === 'MONITOR'
      || signal.action === 'HOLD_AND_REVIEW'
    ) {
      holdReasons.push('HOLD_PHASE19_MONITOR');
      continue;
    }

    if (
      signal.action !== 'ADD_VOLUME_CAUTIOUSLY'
      && signal.action !== 'REDUCE_VOLUME_CAUTIOUSLY'
    ) {
      continue;
    }

    const suggested = signal.suggestedEffectiveSetChange;
    if (
      suggested === null
      || !Number.isFinite(suggested)
      || Math.abs(suggested) < 1
    ) {
      holdReasons.push('HOLD_PHASE19_SMALL_CHANGE');
      continue;
    }

    const direction = signal.action === 'ADD_VOLUME_CAUTIOUSLY' ? 1 : -1;
    const budget = Math.min(
      MAX_VOLUME_PRESCRIPTION_CHANGES_PER_SIGNAL,
      Math.floor(Math.abs(suggested)),
    );

    const candidates = context.futureExercises
      .filter((future) => {
        if (future.currentlyExcluded) return false;
        if (future.targetMuscleGroup !== signal.muscleGroup) return false;
        if (future.targetContributionRole !== 'DIRECT') return false;
        if (changedExercises.has(future.programExerciseId)) return false;

        const next = future.workingSets + direction;
        return next >= 2 && next <= 4;
      })
      .sort(futureOrder)
      .slice(0, budget);

    if (candidates.length === 0) {
      holdReasons.push('HOLD_NO_MATCHING_FUTURE_EXERCISE');
      continue;
    }

    for (const future of candidates) {
      if (!canAdd()) break;

      addChange({
        programExerciseId: future.programExerciseId,
        field: 'WORKING_SETS',
        oldValue: future.workingSets,
        newValue: future.workingSets + direction,
        reasonCode:
          direction > 0
            ? 'ADD_VOLUME_PHASE19'
            : 'REDUCE_VOLUME_PHASE19',
      });
    }
  }

  changes.sort((left, right) => {
    const id = left.programExerciseId.localeCompare(right.programExerciseId);
    return id !== 0 ? id : left.field.localeCompare(right.field);
  });

  const reasonCodes = changes.length > 0
    ? uniqueReasons(changes.map((change) =>
        appliedReasonFor(change.reasonCode)
      ))
    : uniqueReasons(
        holdReasons.length > 0
          ? holdReasons
          : ['HOLD_NO_ADAPTIVE_SIGNAL'],
      );

  const evidenceSnapshot: TrainingProgramAdaptationEvidenceSnapshot = {
    policyVersion: TRAINING_PROGRAM_ADAPTATION_VERSION,
    triggerProgramWorkoutId: context.triggerProgramWorkoutId,
    triggerWorkoutSessionId: context.triggerWorkoutSessionId,
    triggerScheduledDate: context.triggerScheduledDate,
    triggerScoringDate: context.triggerScoringDate,
    actualExercises: [...context.actualExercises].sort(actualOrder),
    phase19Signals: sortedSignals,
    generatedChangeCount: changes.length,
  };

  return {
    policyVersion: TRAINING_PROGRAM_ADAPTATION_VERSION,
    reasonCodes,
    changes,
    evidenceSnapshot,
  };
}
