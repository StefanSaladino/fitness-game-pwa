import {
  TRAINING_PROGRAM_VERSION,
  validateTrainingProgramDefinition,
  type TrainingProgramDefinition,
  type TrainingProgramExercisePrescription,
  type TrainingProgramGoal,
  type TrainingProgramTargetMuscleGroup,
} from './trainingProgram';
import {
  buildTrainingProgramSchedule,
  normalizeTrainingProgramDays,
  resolveTrainingProgramSplit,
  type TrainingProgramDayOfWeek,
  type TrainingProgramDurationWeeks,
  type TrainingProgramRequestedSplit,
  type TrainingProgramResolvedSplit,
} from './trainingProgramSchedule';
import {
  normalizeTrainingProgramConstraintSnapshot,
  trainingProgramExcludedExerciseIds,
  trainingProgramPreferredExerciseIds,
  type TrainingProgramConstraintSnapshot,
} from './trainingProgramConstraints';
import {
  availableTrainingProgramEquipment,
  isTrainingProgramMeasurementType,
  resolveTrainingProgramExerciseRequirements,
  trainingProgramRequirementsAreAvailable,
} from './trainingProgramExerciseRequirements';
import type {
  TrainingProgramAccessMode,
  TrainingProgramEquipmentKey,
} from './trainingProgramEquipment';

export type TrainingProgramMuscleGroup = TrainingProgramTargetMuscleGroup;

export interface TrainingProgramCandidateContribution {
  muscleGroup: TrainingProgramMuscleGroup;
  role: 'DIRECT' | 'INDIRECT';
  weight: number;
}

export interface TrainingProgramGeneratorCandidate {
  exerciseId: string;
  canonicalName: string;
  measurementType: string;
  primaryMuscleGroup: string;
  workoutType: string;
  supportsAddedWeight: boolean;
  supportsAssisted: boolean;
  volumeEligible: boolean;
  contributions: TrainingProgramCandidateContribution[];
}

export interface TrainingProgramExerciseHistory {
  exerciseId: string;
  metricType: 'E1RM' | 'BODYWEIGHT_REPS' | null;
  bestValue: number | null;
  referenceWeightKg: number | null;
  referenceReps: number | null;
  sessionCount: number;
  observationCount: number;
  achievedAt: string | null;
  lastPerformedAt: string;
}

export type TrainingProgramVolumeAction =
  | 'NO_ACTION'
  | 'MONITOR'
  | 'MAINTAIN'
  | 'ADD_VOLUME_CAUTIOUSLY'
  | 'HOLD_AND_REVIEW'
  | 'REDUCE_VOLUME_CAUTIOUSLY';

export interface TrainingProgramVolumeSignal {
  muscleGroup: TrainingProgramMuscleGroup;
  action: TrainingProgramVolumeAction;
  suggestedEffectiveSetChange: number | null;
}

export interface TrainingProgramGeneratorProfile {
  goal: TrainingProgramGoal;
  sessionsPerWeek: number;
  accessMode: TrainingProgramAccessMode;
  equipmentKeys: TrainingProgramEquipmentKey[];
  revision: number;
}

export interface GenerateTrainingProgramInput {
  profile: TrainingProgramGeneratorProfile;
  candidates: TrainingProgramGeneratorCandidate[];
  history: TrainingProgramExerciseHistory[];
  volumeSignals: TrainingProgramVolumeSignal[];
  constraints: TrainingProgramConstraintSnapshot;
  durationWeeks: TrainingProgramDurationWeeks;
  startDate: string;
  trainingDays: TrainingProgramDayOfWeek[];
  requestedSplit: TrainingProgramRequestedSplit;
  generatedAt: string;
  historyThroughDate: string;
  muscleVolumeMethodologyVersion: string;
}

export type TrainingProgramGenerationErrorCode =
  | 'INVALID_PROFILE'
  | 'NO_ELIGIBLE_CANDIDATES'
  | 'INSUFFICIENT_CANDIDATES'
  | 'INVALID_OUTPUT';

export class TrainingProgramGenerationError extends Error {
  constructor(
    public readonly code: TrainingProgramGenerationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TrainingProgramGenerationError';
  }
}

interface SessionSlot {
  muscleGroup: TrainingProgramMuscleGroup;
  compoundPreferred: boolean;
}

interface SessionBlueprint {
  title: string;
  slots: SessionSlot[];
}

const slot = (
  muscleGroup: TrainingProgramMuscleGroup,
  compoundPreferred = false,
): SessionSlot => ({ muscleGroup, compoundPreferred });

const SPLIT_BLUEPRINTS: Record<
  TrainingProgramResolvedSplit,
  SessionBlueprint[]
> = {
  FULL_BODY: [{ title: 'Full Body', slots: [
    slot('QUADS', true), slot('CHEST', true), slot('LATS', true),
    slot('HAMSTRINGS', true), slot('UPPER_BACK'),
    slot('LATERAL_DELTS'), slot('CORE'),
  ] }],
  FULL_BODY_AB: [
    { title: 'Full Body A', slots: [
      slot('QUADS', true), slot('CHEST', true), slot('LATS', true),
      slot('HAMSTRINGS'), slot('LATERAL_DELTS'), slot('CORE'),
    ] },
    { title: 'Full Body B', slots: [
      slot('GLUTES', true), slot('UPPER_BACK', true), slot('CHEST', true),
      slot('QUADS'), slot('POSTERIOR_DELTS'), slot('TRICEPS'),
    ] },
  ],
  UPPER_LOWER: [
    { title: 'Upper', slots: [
      slot('CHEST', true), slot('LATS', true), slot('ANTERIOR_DELTS'),
      slot('UPPER_BACK'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  FULL_BODY_ABC: [
    { title: 'Full Body A', slots: [
      slot('QUADS', true), slot('CHEST', true), slot('LATS', true),
      slot('HAMSTRINGS'), slot('LATERAL_DELTS'), slot('CORE'),
    ] },
    { title: 'Full Body B', slots: [
      slot('GLUTES', true), slot('ANTERIOR_DELTS', true),
      slot('UPPER_BACK', true), slot('QUADS'), slot('TRICEPS'),
      slot('TRAPS'),
    ] },
    { title: 'Full Body C', slots: [
      slot('HAMSTRINGS', true), slot('CHEST', true), slot('LATS', true),
      slot('GLUTES'), slot('POSTERIOR_DELTS'), slot('BICEPS'),
      slot('SPINAL_ERECTORS'),
    ] },
  ],
  PUSH_PULL_LEGS: [
    { title: 'Push', slots: [
      slot('CHEST', true), slot('ANTERIOR_DELTS', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull', slots: [
      slot('LATS', true), slot('UPPER_BACK'), slot('BICEPS'),
      slot('POSTERIOR_DELTS'), slot('TRAPS'), slot('FOREARMS_GRIP'),
    ] },
    { title: 'Legs', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('QUADS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  UPPER_LOWER_FULL_BODY: [
    { title: 'Upper', slots: [
      slot('CHEST', true), slot('LATS', true), slot('ANTERIOR_DELTS'),
      slot('UPPER_BACK'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Full Body', slots: [
      slot('QUADS', true), slot('CHEST', true), slot('LATS', true),
      slot('HAMSTRINGS'), slot('LATERAL_DELTS'), slot('CORE'),
    ] },
  ],
  UPPER_LOWER_X2: [
    { title: 'Upper A', slots: [
      slot('CHEST', true), slot('LATS', true),
      slot('ANTERIOR_DELTS', true), slot('UPPER_BACK'),
      slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower A', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Upper B', slots: [
      slot('UPPER_BACK', true), slot('CHEST', true),
      slot('LATERAL_DELTS'), slot('LATS'),
      slot('POSTERIOR_DELTS'), slot('TRAPS'), slot('BICEPS'),
    ] },
    { title: 'Lower B', slots: [
      slot('GLUTES', true), slot('QUADS', true), slot('HAMSTRINGS'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  PUSH_PULL_UPPER_LOWER: [
    { title: 'Push', slots: [
      slot('CHEST', true), slot('ANTERIOR_DELTS', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull', slots: [
      slot('LATS', true), slot('UPPER_BACK'), slot('BICEPS'),
      slot('POSTERIOR_DELTS'), slot('TRAPS'), slot('FOREARMS_GRIP'),
    ] },
    { title: 'Upper', slots: [
      slot('CHEST', true), slot('UPPER_BACK', true), slot('LATS'),
      slot('LATERAL_DELTS'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  PPL_UPPER_LOWER: [
    { title: 'Push', slots: [
      slot('CHEST', true), slot('ANTERIOR_DELTS', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull', slots: [
      slot('LATS', true), slot('UPPER_BACK'), slot('BICEPS'),
      slot('POSTERIOR_DELTS'), slot('TRAPS'), slot('FOREARMS_GRIP'),
    ] },
    { title: 'Legs', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('QUADS'), slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Upper', slots: [
      slot('CHEST', true), slot('LATS', true), slot('LATERAL_DELTS'),
      slot('UPPER_BACK'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  UPPER_LOWER_PPL: [
    { title: 'Upper', slots: [
      slot('CHEST', true), slot('LATS', true), slot('LATERAL_DELTS'),
      slot('UPPER_BACK'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Push', slots: [
      slot('CHEST', true), slot('ANTERIOR_DELTS', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull', slots: [
      slot('LATS', true), slot('UPPER_BACK'), slot('BICEPS'),
      slot('POSTERIOR_DELTS'), slot('TRAPS'), slot('FOREARMS_GRIP'),
    ] },
    { title: 'Legs', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('QUADS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  PPL_X2: [
    { title: 'Push A', slots: [
      slot('CHEST', true), slot('ANTERIOR_DELTS', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull A', slots: [
      slot('LATS', true), slot('UPPER_BACK'), slot('BICEPS'),
      slot('POSTERIOR_DELTS'), slot('FOREARMS_GRIP'),
    ] },
    { title: 'Legs A', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Push B', slots: [
      slot('ANTERIOR_DELTS', true), slot('CHEST', true), slot('TRICEPS'),
      slot('CHEST'), slot('LATERAL_DELTS'),
    ] },
    { title: 'Pull B', slots: [
      slot('UPPER_BACK', true), slot('LATS'), slot('BICEPS'),
      slot('TRAPS'), slot('POSTERIOR_DELTS'), slot('CORE'),
    ] },
    { title: 'Legs B', slots: [
      slot('GLUTES', true), slot('QUADS', true), slot('HAMSTRINGS'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
  UPPER_LOWER_X3: [
    { title: 'Upper A', slots: [
      slot('CHEST', true), slot('LATS', true), slot('ANTERIOR_DELTS'),
      slot('UPPER_BACK'), slot('BICEPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower A', slots: [
      slot('QUADS', true), slot('HAMSTRINGS', true), slot('GLUTES'),
      slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Upper B', slots: [
      slot('UPPER_BACK', true), slot('CHEST', true), slot('LATS'),
      slot('LATERAL_DELTS'), slot('POSTERIOR_DELTS'), slot('BICEPS'),
    ] },
    { title: 'Lower B', slots: [
      slot('GLUTES', true), slot('QUADS', true), slot('HAMSTRINGS'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
    { title: 'Upper C', slots: [
      slot('CHEST', true), slot('LATS', true), slot('UPPER_BACK'),
      slot('ANTERIOR_DELTS'), slot('TRAPS'), slot('TRICEPS'),
    ] },
    { title: 'Lower C', slots: [
      slot('HAMSTRINGS', true), slot('QUADS', true), slot('GLUTES'),
      slot('SPINAL_ERECTORS'), slot('CALVES'), slot('CORE'),
    ] },
  ],
};

const FOUNDATION_EXERCISE_PRIORITY = [
  'Back Squat',
  'Front Squat',
  'Barbell Bench Press',
  'Incline Barbell Bench Press',
  'Deadlift',
  'Romanian Deadlift',
  'Barbell Row',
  'Pendlay Row',
  'Overhead Press',
  'Pull-Up',
  'Chin-Up',
  'Lat Pulldown',
  'Dumbbell Bench Press',
  'Dumbbell Shoulder Press',
  'Dumbbell Row',
  'Goblet Squat',
  'Leg Press',
  'Leg Extension',
  'Lying Leg Curl',
  'Seated Leg Curl',
  'Barbell Hip Thrust',
  'Cable Lateral Raise',
  'Cable Face Pull',
  'Cable Triceps Pushdown',
  'Dumbbell Biceps Curl',
  'Calf Raise',
  'Push-Up',
] as const;

const foundationPriority = new Map<string, number>(
  FOUNDATION_EXERCISE_PRIORITY.map(
    (name, index) => [name, FOUNDATION_EXERCISE_PRIORITY.length - index],
  ),
);

function integerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function primaryCategoryForTarget(
  target: TrainingProgramMuscleGroup,
): string {
  if (
    target === 'LATS'
    || target === 'UPPER_BACK'
    || target === 'TRAPS'
    || target === 'SPINAL_ERECTORS'
  ) {
    return 'BACK';
  }

  if (
    target === 'ANTERIOR_DELTS'
    || target === 'LATERAL_DELTS'
    || target === 'POSTERIOR_DELTS'
  ) {
    return 'SHOULDERS';
  }

  return target;
}

export function trainingProgramPrimaryGroupMatchesTarget(
  primaryMuscleGroup: string,
  target: TrainingProgramMuscleGroup,
): boolean {
  return primaryMuscleGroup === primaryCategoryForTarget(target);
}

function contributionFor(
  candidate: TrainingProgramGeneratorCandidate,
  muscleGroup: TrainingProgramMuscleGroup,
): TrainingProgramCandidateContribution | null {
  return candidate.contributions.find(
    (contribution) => contribution.muscleGroup === muscleGroup,
  ) ?? null;
}

export function isTrainingProgramCompoundCandidate(candidate: TrainingProgramGeneratorCandidate): boolean {
  const name = candidate.canonicalName.toLocaleLowerCase('en-CA');
  return (
    candidate.contributions.filter(
      (contribution) => contribution.role === 'DIRECT',
    ).length >= 2
    || /squat|deadlift|bench press|overhead press|shoulder press|row|pull-up|chin-up|dip|lunge|split squat|step-up|hip thrust|clean|snatch|jerk|muscle-up/.test(name)
  );
}

function goalEquipmentScore(goal: TrainingProgramGoal, workoutType: string): number {
  const strength: Record<string, number> = {
    BARBELL: 18,
    OLYMPIC_POWER: 14,
    DUMBBELL: 10,
    MACHINE: 8,
    BODYWEIGHT: 7,
    CABLE: 6,
    KETTLEBELL: 8,
    LANDMINE: 8,
    PLYOMETRIC: 4,
    SPECIALTY: 8,
    STRONGMAN_CARRY_SLED: 8,
  };
  const hypertrophy: Record<string, number> = {
    MACHINE: 16,
    CABLE: 15,
    DUMBBELL: 14,
    BARBELL: 13,
    BODYWEIGHT: 9,
    KETTLEBELL: 7,
    LANDMINE: 9,
    OLYMPIC_POWER: 2,
    PLYOMETRIC: 1,
    SPECIALTY: 8,
    STRONGMAN_CARRY_SLED: 2,
  };
  const balanced: Record<string, number> = {
    BARBELL: 14,
    DUMBBELL: 13,
    MACHINE: 12,
    CABLE: 12,
    BODYWEIGHT: 11,
    KETTLEBELL: 9,
    LANDMINE: 9,
    OLYMPIC_POWER: 6,
    PLYOMETRIC: 5,
    SPECIALTY: 8,
    STRONGMAN_CARRY_SLED: 5,
  };

  const source = goal === 'STRENGTH'
    ? strength
    : goal === 'HYPERTROPHY'
      ? hypertrophy
      : balanced;

  return source[workoutType] ?? 0;
}

function candidateScore(
  candidate: TrainingProgramGeneratorCandidate,
  target: SessionSlot,
  goal: TrainingProgramGoal,
  history: TrainingProgramExerciseHistory | undefined,
  priorProgramUseCount: number,
  preferredExerciseIds: ReadonlySet<string>,
): number {
  const contribution = contributionFor(candidate, target.muscleGroup);
  const direct = contribution?.role === 'DIRECT';
  const compound = isTrainingProgramCompoundCandidate(candidate);
  const historyScore = history
    ? Math.min(8, Math.max(0, history.sessionCount)) * 5
      + Math.min(12, Math.max(0, history.observationCount))
    : 0;

  return (
    (direct ? 110 : 45)
    + Math.round((contribution?.weight ?? 0) * 20)
    + (
      trainingProgramPrimaryGroupMatchesTarget(
        candidate.primaryMuscleGroup,
        target.muscleGroup,
      )
        ? 15
        : 0
    )
    + (target.compoundPreferred && compound ? 22 : 0)
    + (!target.compoundPreferred && !compound ? 8 : 0)
    + goalEquipmentScore(goal, candidate.workoutType)
    + (foundationPriority.get(candidate.canonicalName) ?? 0)
    + historyScore
    + (preferredExerciseIds.has(candidate.exerciseId) ? 40 : 0)
    - priorProgramUseCount * 28
  );
}

function repRange(
  goal: TrainingProgramGoal,
  compound: boolean,
): [number, number] {
  if (goal === 'STRENGTH') return compound ? [4, 6] : [6, 10];
  if (goal === 'HYPERTROPHY') return compound ? [6, 10] : [8, 15];
  return compound ? [5, 8] : [8, 12];
}

function setCount(
  goal: TrainingProgramGoal,
  compound: boolean,
  candidate: TrainingProgramGeneratorCandidate,
  signals: Map<TrainingProgramMuscleGroup, TrainingProgramVolumeSignal>,
): number {
  let sets = goal === 'STRENGTH'
    ? (compound ? 3 : 2)
    : goal === 'HYPERTROPHY'
      ? 3
      : (compound ? 3 : 2);

  const directMuscles = candidate.contributions
    .filter((contribution) => contribution.role === 'DIRECT')
    .map((contribution) => contribution.muscleGroup);

  const actions = directMuscles
    .map((muscle) => signals.get(muscle)?.action)
    .filter(Boolean);

  if (actions.includes('REDUCE_VOLUME_CAUTIOUSLY')) {
    sets -= 1;
  } else if (actions.includes('ADD_VOLUME_CAUTIOUSLY')) {
    sets += 1;
  }

  return Math.max(2, Math.min(4, sets));
}

export function resolveTrainingProgramReferenceWeight(
  candidate: TrainingProgramGeneratorCandidate,
  history: TrainingProgramExerciseHistory | undefined,
  repsMin: number,
  repsMax: number,
): number | null {
  if (candidate.measurementType !== 'WEIGHT_REPS' || !history) return null;
  if (history.observationCount < 3 || history.sessionCount < 2) return null;

  if (
    history.referenceWeightKg === null
    || history.referenceWeightKg <= 0
    || history.referenceReps === null
    || history.referenceReps < repsMin
    || history.referenceReps > repsMax
  ) {
    return null;
  }

  return Math.round(history.referenceWeightKg * 100) / 100;
}

function prescription(
  candidate: TrainingProgramGeneratorCandidate,
  orderIndex: number,
  goal: TrainingProgramGoal,
  history: TrainingProgramExerciseHistory | undefined,
  signals: Map<TrainingProgramMuscleGroup, TrainingProgramVolumeSignal>,
  target: SessionSlot,
): TrainingProgramExercisePrescription {
  if (!isTrainingProgramMeasurementType(candidate.measurementType)) {
    throw new TrainingProgramGenerationError(
      'INVALID_OUTPUT',
      `${candidate.canonicalName} has an unsupported generated measurement type.`,
    );
  }

  const compound = isTrainingProgramCompoundCandidate(candidate);
  const [repsMin, repsMax] = repRange(goal, compound);
  const targetContribution = contributionFor(
    candidate,
    target.muscleGroup,
  );

  if (!targetContribution) {
    throw new TrainingProgramGenerationError(
      'INVALID_OUTPUT',
      `${candidate.canonicalName} is missing its generated target contribution.`,
    );
  }

  return {
    exerciseId: candidate.exerciseId,
    canonicalName: candidate.canonicalName,
    targetMuscleGroup: target.muscleGroup,
    targetContributionRole: targetContribution.role,
    selectionIntent: compound ? 'COMPOUND' : 'ACCESSORY',
    measurementType: candidate.measurementType,
    orderIndex,
    workingSets: setCount(goal, compound, candidate, signals),
    repsMin,
    repsMax,
    targetWeightKg: resolveTrainingProgramReferenceWeight(
      candidate,
      history,
      repsMin,
      repsMax,
    ),
    bodyweightMode: candidate.measurementType === 'BODYWEIGHT_REPS'
      ? 'BODYWEIGHT'
      : null,
    supersetGroupIndex: null,
    supersetOrder: null,
  };
}

function candidatePool(
  input: GenerateTrainingProgramInput,
  constraints: TrainingProgramConstraintSnapshot,
): TrainingProgramGeneratorCandidate[] {
  const available = availableTrainingProgramEquipment(
    input.profile.accessMode,
    input.profile.equipmentKeys,
  );
  const excludedExerciseIds = trainingProgramExcludedExerciseIds(
    constraints,
  );

  return input.candidates
    .filter((candidate) => {
      if (excludedExerciseIds.has(candidate.exerciseId)) return false;
      if (!candidate.volumeEligible) return false;
      if (!isTrainingProgramMeasurementType(candidate.measurementType)) {
        return false;
      }
      if (candidate.contributions.length < 1) return false;

      const requirements = resolveTrainingProgramExerciseRequirements(candidate);
      return trainingProgramRequirementsAreAvailable(requirements, available);
    })
    .sort((left, right) => {
      const name = left.canonicalName.localeCompare(
        right.canonicalName,
        'en-CA',
      );
      return name !== 0 ? name : left.exerciseId.localeCompare(right.exerciseId);
    });
}

export function generateTrainingProgram(
  input: GenerateTrainingProgramInput,
): TrainingProgramDefinition {
  if (
    !integerInRange(input.profile.sessionsPerWeek, 1, 6)
    || !['STRENGTH', 'HYPERTROPHY', 'BALANCED'].includes(input.profile.goal)
    || !Number.isSafeInteger(input.profile.revision)
    || input.profile.revision < 1
  ) {
    throw new TrainingProgramGenerationError(
      'INVALID_PROFILE',
      'Training program profile is incomplete or invalid.',
    );
  }

  let constraints: TrainingProgramConstraintSnapshot;
  try {
    constraints = normalizeTrainingProgramConstraintSnapshot(
      input.constraints.revision,
      input.constraints.entries,
    );
  } catch {
    throw new TrainingProgramGenerationError(
      'INVALID_PROFILE',
      'Training program constraints are incomplete or invalid.',
    );
  }

  let trainingDays: TrainingProgramDayOfWeek[];
  let resolvedSplit: TrainingProgramResolvedSplit;
  let schedule;

  try {
    trainingDays = normalizeTrainingProgramDays(
      input.trainingDays,
      input.profile.sessionsPerWeek,
    );
    resolvedSplit = resolveTrainingProgramSplit(
      input.profile.sessionsPerWeek,
      input.requestedSplit,
    );
    schedule = buildTrainingProgramSchedule({
      startDate: input.startDate,
      durationWeeks: input.durationWeeks,
      trainingDays,
      sessionsPerWeek: input.profile.sessionsPerWeek,
    });
  } catch {
    throw new TrainingProgramGenerationError(
      'INVALID_PROFILE',
      'Training program schedule or split configuration is invalid.',
    );
  }

  const pool = candidatePool(input, constraints);
  if (pool.length === 0) {
    throw new TrainingProgramGenerationError(
      'NO_ELIGIBLE_CANDIDATES',
      'No Phase-19-mapped exercises satisfy the current equipment and logging constraints.',
    );
  }

  const historyByExercise = new Map(
    input.history.map((entry) => [entry.exerciseId, entry]),
  );
  const signals = new Map(
    input.volumeSignals.map((signal) => [signal.muscleGroup, signal]),
  );
  const programUseCount = new Map<string, number>();
  const preferredExerciseIds = trainingProgramPreferredExerciseIds(
    constraints,
  );
  const blueprints = SPLIT_BLUEPRINTS[resolvedSplit];

  if (blueprints.length !== input.profile.sessionsPerWeek) {
    throw new TrainingProgramGenerationError(
      'INVALID_PROFILE',
      'Resolved training split does not match weekly frequency.',
    );
  }

  const baseWorkouts = blueprints.map((blueprint, sessionIndex) => {
    const selected: TrainingProgramGeneratorCandidate[] = [];
    const selectedTargets: SessionSlot[] = [];
    const used = new Set<string>();

    for (const target of blueprint.slots) {
      const ranked = pool
        .filter((candidate) => {
          if (used.has(candidate.exerciseId)) return false;
          return Boolean(contributionFor(candidate, target.muscleGroup));
        })
        .map((candidate) => ({
          candidate,
          score: candidateScore(
            candidate,
            target,
            input.profile.goal,
            historyByExercise.get(candidate.exerciseId),
            programUseCount.get(candidate.exerciseId) ?? 0,
            preferredExerciseIds,
          ),
        }))
        .sort((left, right) => {
          if (left.score !== right.score) return right.score - left.score;
          const name = left.candidate.canonicalName.localeCompare(
            right.candidate.canonicalName,
            'en-CA',
          );
          return name !== 0
            ? name
            : left.candidate.exerciseId.localeCompare(right.candidate.exerciseId);
        });

      const winner = ranked[0]?.candidate;
      if (!winner) continue;

      selected.push(winner);
      selectedTargets.push(target);
      used.add(winner.exerciseId);
      programUseCount.set(
        winner.exerciseId,
        (programUseCount.get(winner.exerciseId) ?? 0) + 1,
      );
    }

    if (selected.length < 4) {
      throw new TrainingProgramGenerationError(
        'INSUFFICIENT_CANDIDATES',
        `${blueprint.title} could only resolve ${selected.length} compatible exercises; at least 4 are required.`,
      );
    }

    return {
      sessionIndex,
      title: blueprint.title,
      exercises: selected.map((candidate, orderIndex) => prescription(
        candidate,
        orderIndex,
        input.profile.goal,
        historyByExercise.get(candidate.exerciseId),
        signals,
        selectedTargets[orderIndex]!,
      )),
    };
  });

  const workouts = schedule.map((slot) => {
    const workout = baseWorkouts[slot.sessionIndex]!;
    return {
      weekIndex: slot.weekIndex,
      sessionIndex: slot.sessionIndex,
      scheduledDate: slot.scheduledDate,
      title: workout.title,
      exercises: workout.exercises.map((exercise) => ({ ...exercise })),
    };
  });

  const program: TrainingProgramDefinition = {
    version: TRAINING_PROGRAM_VERSION,
    goal: input.profile.goal,
    weeks: input.durationWeeks,
    sessionsPerWeek: input.profile.sessionsPerWeek,
    source: {
      generatorVersion: TRAINING_PROGRAM_VERSION,
      generatedAt: input.generatedAt,
      historyThroughDate: input.historyThroughDate,
      muscleVolumeMethodologyVersion: input.muscleVolumeMethodologyVersion,
      profileRevision: input.profile.revision,
      constraintRevision: constraints.revision,
      durationWeeks: input.durationWeeks,
      startDate: input.startDate,
      trainingDays,
      requestedSplit: input.requestedSplit,
      resolvedSplit,
    },
    workouts,
  };

  const issues = validateTrainingProgramDefinition(program);
  if (issues.length > 0) {
    throw new TrainingProgramGenerationError(
      'INVALID_OUTPUT',
      `Generated program failed structural validation: ${issues
        .map((issue) => issue.code)
        .join(', ')}`,
    );
  }

  return program;
}
