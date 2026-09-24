import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TRAINING_PROGRAM_TARGET_MUSCLE_GROUPS,
  type TrainingProgramBodyweightMode,
  type TrainingProgramMeasurementType,
  type TrainingProgramTargetContributionRole,
  type TrainingProgramTargetMuscleGroup,
} from '../../domain/trainingProgram';
import {
  buildTrainingProgramAdaptationPlan,
  type ExistingTrainingProgramAdaptation,
  type TrainingProgramAdaptationActualExerciseEvidence,
  type TrainingProgramAdaptationContext,
  type TrainingProgramAdaptationFutureExercise,
  type TrainingProgramAdaptationSummaryReasonCode,
  type TrainingProgramAdaptationVolumeSignal,
} from '../../domain/trainingProgramAdaptation';
import { getSupabaseClient } from '../../lib/supabase';
import {
  createMusclePerformanceService,
  type MusclePerformanceService,
} from '../progress/musclePerformanceService';
import { buildMuscleVolumeRecommendationPayloads } from '../progress/muscleVolumeRecommendationModel';
import {
  createExerciseProgressService,
  type ExerciseProgressService,
} from '../progress/progressService';

type RecordValue = Record<string, unknown>;

export interface TrainingProgramAdaptationResult {
  adaptationId: string;
  outcome: 'APPLIED' | 'NO_CHANGE';
  sourceProgramRevision: number;
  resultingProgramRevision: number;
  changeCount: number | null;
  alreadyApplied: boolean;
}

export interface TrainingProgramAdaptationServiceDependencies {
  progressService: ExerciseProgressService;
  performanceService: MusclePerformanceService;
}

export interface TrainingProgramAdaptationService {
  adapt(
    programId: string,
    triggerProgramWorkoutId: string,
  ): Promise<TrainingProgramAdaptationResult>;
}

function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid object.`);
  }
  return value as RecordValue;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} returned an invalid string.`);
  }
  return value;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function requiredInteger(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} returned an invalid integer.`);
  }
  return parsed;
}

function nullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function measurementType(
  value: unknown,
): TrainingProgramMeasurementType {
  if (value === 'WEIGHT_REPS' || value === 'BODYWEIGHT_REPS') {
    return value;
  }
  throw new Error('Adaptation context returned an invalid measurement type.');
}

function bodyweightMode(
  value: unknown,
): TrainingProgramBodyweightMode | null {
  if (value === null || value === undefined) return null;
  if (
    value === 'BODYWEIGHT'
    || value === 'ADDED_WEIGHT'
    || value === 'ASSISTED'
  ) {
    return value;
  }
  throw new Error('Adaptation context returned an invalid bodyweight mode.');
}

function muscleGroup(
  value: unknown,
): TrainingProgramTargetMuscleGroup {
  if (
    typeof value === 'string'
    && (
      TRAINING_PROGRAM_TARGET_MUSCLE_GROUPS as readonly string[]
    ).includes(value)
  ) {
    return value as TrainingProgramTargetMuscleGroup;
  }
  throw new Error('Adaptation context returned an invalid muscle group.');
}

function contributionRole(
  value: unknown,
): TrainingProgramTargetContributionRole {
  if (value === 'DIRECT' || value === 'INDIRECT') return value;
  throw new Error('Adaptation context returned an invalid contribution role.');
}

function selectionIntent(value: unknown): 'COMPOUND' | 'ACCESSORY' {
  if (value === 'COMPOUND' || value === 'ACCESSORY') return value;
  throw new Error('Adaptation context returned an invalid selection intent.');
}

function mapActual(
  value: unknown,
): TrainingProgramAdaptationActualExerciseEvidence {
  const row = object(value, 'Adaptation actual exercise');

  return {
    exerciseId: requiredText(row.exerciseId, 'Adaptation exercise id'),
    canonicalName: requiredText(row.canonicalName, 'Adaptation exercise name'),
    measurementType: measurementType(row.measurementType),
    plannedWorkingSets: nullableInteger(row.plannedWorkingSets),
    standardWorkingSetCount: requiredInteger(
      row.standardWorkingSetCount,
      'Adaptation standard working sets',
    ),
    nonstandardCompletedSetCount: requiredInteger(
      row.nonstandardCompletedSetCount,
      'Adaptation nonstandard sets',
    ),
    minCompletedReps: nullableInteger(row.minCompletedReps),
    maxCompletedReps: nullableInteger(row.maxCompletedReps),
    minWeightKg: nullableNumber(row.minWeightKg),
    maxWeightKg: nullableNumber(row.maxWeightKg),
    plainBodyweightSetCount: requiredInteger(
      row.plainBodyweightSetCount,
      'Adaptation plain bodyweight sets',
    ),
    addedWeightSetCount: requiredInteger(
      row.addedWeightSetCount,
      'Adaptation added-weight sets',
    ),
    assistedSetCount: requiredInteger(
      row.assistedSetCount,
      'Adaptation assisted sets',
    ),
  };
}

function mapFuture(
  value: unknown,
): TrainingProgramAdaptationFutureExercise {
  const row = object(value, 'Adaptation future exercise');

  return {
    programExerciseId: requiredText(
      row.programExerciseId,
      'Program exercise id',
    ),
    programWorkoutId: requiredText(
      row.programWorkoutId,
      'Program workout id',
    ),
    scheduledDate: requiredText(
      row.scheduledDate,
      'Program scheduled date',
    ),
    exerciseId: requiredText(row.exerciseId, 'Exercise id'),
    canonicalName: requiredText(row.canonicalName, 'Exercise name'),
    targetMuscleGroup: muscleGroup(row.targetMuscleGroup),
    targetContributionRole: contributionRole(
      row.targetContributionRole,
    ),
    selectionIntent: selectionIntent(row.selectionIntent),
    measurementType: measurementType(row.measurementType),
    workingSets: requiredInteger(row.workingSets, 'Program working sets'),
    repsMin: requiredInteger(row.repsMin, 'Program minimum reps'),
    repsMax: requiredInteger(row.repsMax, 'Program maximum reps'),
    targetWeightKg: nullableNumber(row.targetWeightKg),
    bodyweightMode: bodyweightMode(row.bodyweightMode),
    orderIndex: requiredInteger(row.orderIndex, 'Program exercise order'),
    currentlyExcluded: Boolean(row.currentlyExcluded),
  };
}

function summaryReason(
  value: unknown,
): TrainingProgramAdaptationSummaryReasonCode {
  if (
    value === 'LOAD_ESTABLISHED'
    || value === 'LOAD_PROGRESSED'
    || value === 'BODYWEIGHT_REPS_PROGRESSED'
    || value === 'VOLUME_ADDED'
    || value === 'VOLUME_REDUCED'
    || value === 'HOLD_INCOMPLETE_SETS'
    || value === 'HOLD_ADVANCED_SET_EDIT'
    || value === 'HOLD_REPS_BELOW_TOP'
    || value === 'HOLD_NO_MATCHING_FUTURE_EXERCISE'
    || value === 'HOLD_PHASE19_MONITOR'
    || value === 'HOLD_PHASE19_MAINTAIN'
    || value === 'HOLD_PHASE19_SMALL_CHANGE'
    || value === 'HOLD_CONSTRAINT_EXCLUDED'
    || value === 'HOLD_UNSUPPORTED_LOAD_MODE'
    || value === 'HOLD_NO_ADAPTIVE_SIGNAL'
  ) {
    return value;
  }
  throw new Error('Adaptation context returned an invalid reason code.');
}

function mapExisting(
  value: unknown,
): ExistingTrainingProgramAdaptation | null {
  if (value === null || value === undefined) return null;
  const row = object(value, 'Existing adaptation');
  const codes = Array.isArray(row.reasonCodes)
    ? row.reasonCodes.map(summaryReason)
    : [];

  if (row.outcome !== 'APPLIED' && row.outcome !== 'NO_CHANGE') {
    throw new Error('Existing adaptation returned an invalid outcome.');
  }

  return {
    adaptationId: requiredText(row.adaptationId, 'Adaptation id'),
    outcome: row.outcome,
    sourceProgramRevision: requiredInteger(
      row.sourceProgramRevision,
      'Adaptation source revision',
    ),
    resultingProgramRevision: requiredInteger(
      row.resultingProgramRevision,
      'Adaptation resulting revision',
    ),
    reasonCodes: codes,
  };
}

function mapContext(value: unknown): TrainingProgramAdaptationContext {
  const row = object(value, 'Training program adaptation context');

  if (
    row.triggerExecutionStatus !== 'COMPLETED_PROGRAMMED'
    && row.triggerExecutionStatus !== 'COMPLETED_OWN_WORKOUT'
  ) {
    throw new Error(
      'Adaptation context returned an invalid completed execution status.',
    );
  }

  if (!Array.isArray(row.actualExercises) || !Array.isArray(row.futureExercises)) {
    throw new Error('Adaptation context returned invalid exercise arrays.');
  }

  return {
    programId: requiredText(row.programId, 'Training program id'),
    programRevision: requiredInteger(
      row.programRevision,
      'Training program revision',
    ),
    triggerProgramWorkoutId: requiredText(
      row.triggerProgramWorkoutId,
      'Trigger program workout id',
    ),
    triggerWorkoutSessionId: requiredText(
      row.triggerWorkoutSessionId,
      'Trigger workout session id',
    ),
    triggerScheduledDate: requiredText(
      row.triggerScheduledDate,
      'Trigger scheduled date',
    ),
    triggerScoringDate: requiredText(
      row.triggerScoringDate,
      'Trigger scoring date',
    ),
    triggerExecutionStatus: row.triggerExecutionStatus,
    alreadyAdapted: Boolean(row.alreadyAdapted),
    existingAdaptation: mapExisting(row.existingAdaptation),
    actualExercises: row.actualExercises.map(mapActual),
    futureExercises: row.futureExercises.map(mapFuture),
  };
}

function mapApplyResult(value: unknown): TrainingProgramAdaptationResult {
  const row = object(value, 'Training program adaptation result');

  if (row.outcome !== 'APPLIED' && row.outcome !== 'NO_CHANGE') {
    throw new Error('Adaptation result returned an invalid outcome.');
  }

  return {
    adaptationId: requiredText(row.adaptationId, 'Adaptation id'),
    outcome: row.outcome,
    sourceProgramRevision: requiredInteger(
      row.sourceProgramRevision,
      'Adaptation source revision',
    ),
    resultingProgramRevision: requiredInteger(
      row.resultingProgramRevision,
      'Adaptation resulting revision',
    ),
    changeCount: requiredInteger(
      row.changeCount,
      'Adaptation change count',
    ),
    alreadyApplied: Boolean(row.alreadyApplied),
  };
}

function signalMuscleGroup(
  value: string,
): TrainingProgramTargetMuscleGroup | null {
  return (
    TRAINING_PROGRAM_TARGET_MUSCLE_GROUPS as readonly string[]
  ).includes(value)
    ? value as TrainingProgramTargetMuscleGroup
    : null;
}

function shortCircuitResult(
  existing: ExistingTrainingProgramAdaptation,
): TrainingProgramAdaptationResult {
  return {
    adaptationId: existing.adaptationId,
    outcome: existing.outcome,
    sourceProgramRevision: existing.sourceProgramRevision,
    resultingProgramRevision: existing.resultingProgramRevision,
    changeCount: null,
    alreadyApplied: true,
  };
}

export function createTrainingProgramAdaptationService(
  client?: SupabaseClient,
  injected?: Partial<TrainingProgramAdaptationServiceDependencies>,
): TrainingProgramAdaptationService {
  let resolvedClient = client;

  const getClient = (): SupabaseClient => {
    resolvedClient ??= getSupabaseClient();
    return resolvedClient;
  };

  const dependencies: TrainingProgramAdaptationServiceDependencies = {
    progressService: injected?.progressService
      ?? createExerciseProgressService(getClient()),
    performanceService: injected?.performanceService
      ?? createMusclePerformanceService(getClient()),
  };

  return {
    async adapt(programId, triggerProgramWorkoutId) {
      const contextResult = await getClient().rpc(
        'get_my_training_program_adaptation_context',
        {
          p_program_id: programId,
          p_trigger_program_workout_id: triggerProgramWorkoutId,
        },
      );

      if (contextResult.error) throw contextResult.error;
      const context = mapContext(contextResult.data);

      if (context.alreadyAdapted) {
        if (!context.existingAdaptation) {
          throw new Error(
            'Adaptation context is marked complete without an audit record.',
          );
        }
        return shortCircuitResult(context.existingAdaptation);
      }

      const [volumeRows, performanceObservations] = await Promise.all([
        dependencies.progressService.loadMuscleVolume(
          context.triggerScoringDate,
        ),
        dependencies.performanceService.loadObservations(
          context.triggerScoringDate,
          56,
        ),
      ]);

      const payloads = buildMuscleVolumeRecommendationPayloads(
        volumeRows,
        performanceObservations,
      );

      const signals: TrainingProgramAdaptationVolumeSignal[] = payloads
        .filter((payload) => payload.windowDays === 7)
        .flatMap((payload) => {
          const group = signalMuscleGroup(payload.muscleGroup);
          if (!group) return [];

          return [{
            muscleGroup: group,
            action: payload.recommendation.action,
            suggestedEffectiveSetChange:
              payload.recommendation.suggestedEffectiveSetChange,
            volumeStatus: payload.recommendation.volumeAssessment.status,
            performanceTrend: payload.performance.trend,
            performancePersistence: payload.performance.persistence,
            performanceConfidence: payload.performance.confidence,
          }];
        });

      const plan = buildTrainingProgramAdaptationPlan(
        context,
        signals,
      );

      const applyResult = await getClient().rpc(
        'apply_my_training_program_adaptation',
        {
          p_program_id: programId,
          p_trigger_program_workout_id: triggerProgramWorkoutId,
          p_expected_revision: context.programRevision,
          p_evidence_snapshot: plan.evidenceSnapshot,
          p_reason_codes: plan.reasonCodes,
          p_changes: plan.changes,
        },
      );

      if (applyResult.error) throw applyResult.error;
      return mapApplyResult(applyResult.data);
    },
  };
}
