import {
  TRAINING_PROGRAM_VERSION,
  TRAINING_PROGRAM_WEEKS,
  validateTrainingProgramDefinition,
  type TrainingProgramDefinition,
  type TrainingProgramExercisePrescription,
  type TrainingProgramGoal,
} from './trainingProgram';
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

export type TrainingProgramMuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'FOREARMS_GRIP'
  | 'CORE'
  | 'OBLIQUES'
  | 'NECK';

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
  generatedAt: string;
  historyThroughDate: string;
  muscleVolumeMethodologyVersion: string;
  constraintRevision?: number;
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

const SPLITS: Record<number, SessionBlueprint[]> = {
  1: [
    {
      title: 'Full Body',
      slots: [
        slot('QUADS', true),
        slot('CHEST', true),
        slot('BACK', true),
        slot('HAMSTRINGS', true),
        slot('SHOULDERS'),
        slot('CORE'),
      ],
    },
  ],
  2: [
    {
      title: 'Full Body A',
      slots: [
        slot('QUADS', true),
        slot('CHEST', true),
        slot('BACK', true),
        slot('HAMSTRINGS'),
        slot('SHOULDERS'),
        slot('CORE'),
      ],
    },
    {
      title: 'Full Body B',
      slots: [
        slot('GLUTES', true),
        slot('BACK', true),
        slot('CHEST', true),
        slot('QUADS'),
        slot('BICEPS'),
        slot('TRICEPS'),
      ],
    },
  ],
  3: [
    {
      title: 'Full Body A',
      slots: [
        slot('QUADS', true),
        slot('CHEST', true),
        slot('BACK', true),
        slot('HAMSTRINGS'),
        slot('CORE'),
      ],
    },
    {
      title: 'Full Body B',
      slots: [
        slot('GLUTES', true),
        slot('SHOULDERS', true),
        slot('BACK', true),
        slot('QUADS'),
        slot('TRICEPS'),
      ],
    },
    {
      title: 'Full Body C',
      slots: [
        slot('HAMSTRINGS', true),
        slot('CHEST', true),
        slot('BACK', true),
        slot('GLUTES'),
        slot('BICEPS'),
        slot('CORE'),
      ],
    },
  ],
  4: [
    {
      title: 'Upper A',
      slots: [
        slot('CHEST', true),
        slot('BACK', true),
        slot('SHOULDERS', true),
        slot('BACK'),
        slot('BICEPS'),
        slot('TRICEPS'),
      ],
    },
    {
      title: 'Lower A',
      slots: [
        slot('QUADS', true),
        slot('HAMSTRINGS', true),
        slot('GLUTES'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
    {
      title: 'Upper B',
      slots: [
        slot('BACK', true),
        slot('CHEST', true),
        slot('SHOULDERS'),
        slot('CHEST'),
        slot('BICEPS'),
        slot('TRICEPS'),
      ],
    },
    {
      title: 'Lower B',
      slots: [
        slot('GLUTES', true),
        slot('QUADS', true),
        slot('HAMSTRINGS'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
  ],
  5: [
    {
      title: 'Upper',
      slots: [
        slot('CHEST', true),
        slot('BACK', true),
        slot('SHOULDERS'),
        slot('BACK'),
        slot('BICEPS'),
        slot('TRICEPS'),
      ],
    },
    {
      title: 'Lower',
      slots: [
        slot('QUADS', true),
        slot('HAMSTRINGS', true),
        slot('GLUTES'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
    {
      title: 'Push',
      slots: [
        slot('CHEST', true),
        slot('SHOULDERS', true),
        slot('TRICEPS'),
        slot('CHEST'),
        slot('SHOULDERS'),
      ],
    },
    {
      title: 'Pull',
      slots: [
        slot('BACK', true),
        slot('BACK'),
        slot('BICEPS'),
        slot('SHOULDERS'),
        slot('FOREARMS_GRIP'),
      ],
    },
    {
      title: 'Legs',
      slots: [
        slot('QUADS', true),
        slot('HAMSTRINGS', true),
        slot('GLUTES'),
        slot('QUADS'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
  ],
  6: [
    {
      title: 'Push A',
      slots: [
        slot('CHEST', true),
        slot('SHOULDERS', true),
        slot('TRICEPS'),
        slot('CHEST'),
        slot('SHOULDERS'),
      ],
    },
    {
      title: 'Pull A',
      slots: [
        slot('BACK', true),
        slot('BACK'),
        slot('BICEPS'),
        slot('SHOULDERS'),
        slot('FOREARMS_GRIP'),
      ],
    },
    {
      title: 'Legs A',
      slots: [
        slot('QUADS', true),
        slot('HAMSTRINGS', true),
        slot('GLUTES'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
    {
      title: 'Push B',
      slots: [
        slot('SHOULDERS', true),
        slot('CHEST', true),
        slot('TRICEPS'),
        slot('CHEST'),
        slot('SHOULDERS'),
      ],
    },
    {
      title: 'Pull B',
      slots: [
        slot('BACK', true),
        slot('BICEPS'),
        slot('BACK'),
        slot('FOREARMS_GRIP'),
        slot('CORE'),
      ],
    },
    {
      title: 'Legs B',
      slots: [
        slot('GLUTES', true),
        slot('QUADS', true),
        slot('HAMSTRINGS'),
        slot('QUADS'),
        slot('CALVES'),
        slot('CORE'),
      ],
    },
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

function isMuscleGroup(value: string): value is TrainingProgramMuscleGroup {
  return [
    'CHEST',
    'BACK',
    'SHOULDERS',
    'BICEPS',
    'TRICEPS',
    'QUADS',
    'HAMSTRINGS',
    'GLUTES',
    'CALVES',
    'FOREARMS_GRIP',
    'CORE',
    'OBLIQUES',
    'NECK',
  ].includes(value);
}

function contributionFor(
  candidate: TrainingProgramGeneratorCandidate,
  muscleGroup: TrainingProgramMuscleGroup,
): TrainingProgramCandidateContribution | null {
  return candidate.contributions.find(
    (contribution) => contribution.muscleGroup === muscleGroup,
  ) ?? null;
}

function compoundExercise(candidate: TrainingProgramGeneratorCandidate): boolean {
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
): number {
  const contribution = contributionFor(candidate, target.muscleGroup);
  const direct = contribution?.role === 'DIRECT';
  const compound = compoundExercise(candidate);
  const historyScore = history
    ? Math.min(8, Math.max(0, history.sessionCount)) * 5
      + Math.min(12, Math.max(0, history.observationCount))
    : 0;

  return (
    (direct ? 110 : 45)
    + Math.round((contribution?.weight ?? 0) * 20)
    + (candidate.primaryMuscleGroup === target.muscleGroup ? 15 : 0)
    + (target.compoundPreferred && compound ? 22 : 0)
    + (!target.compoundPreferred && !compound ? 8 : 0)
    + goalEquipmentScore(goal, candidate.workoutType)
    + (foundationPriority.get(candidate.canonicalName) ?? 0)
    + historyScore
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

function historicalTargetWeight(
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
): TrainingProgramExercisePrescription {
  if (!isTrainingProgramMeasurementType(candidate.measurementType)) {
    throw new TrainingProgramGenerationError(
      'INVALID_OUTPUT',
      `${candidate.canonicalName} has an unsupported generated measurement type.`,
    );
  }

  const compound = compoundExercise(candidate);
  const [repsMin, repsMax] = repRange(goal, compound);

  return {
    exerciseId: candidate.exerciseId,
    canonicalName: candidate.canonicalName,
    measurementType: candidate.measurementType,
    orderIndex,
    workingSets: setCount(goal, compound, candidate, signals),
    repsMin,
    repsMax,
    targetWeightKg: historicalTargetWeight(
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
): TrainingProgramGeneratorCandidate[] {
  const available = availableTrainingProgramEquipment(
    input.profile.accessMode,
    input.profile.equipmentKeys,
  );

  return input.candidates
    .filter((candidate) => {
      if (!candidate.volumeEligible) return false;
      if (!isTrainingProgramMeasurementType(candidate.measurementType)) {
        return false;
      }
      if (!isMuscleGroup(candidate.primaryMuscleGroup)) return false;
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

  const pool = candidatePool(input);
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
  const blueprints = SPLITS[input.profile.sessionsPerWeek]!;

  const baseWorkouts = blueprints.map((blueprint, sessionIndex) => {
    const selected: TrainingProgramGeneratorCandidate[] = [];
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
      )),
    };
  });

  const workouts = Array.from(
    { length: TRAINING_PROGRAM_WEEKS },
    (_, weekIndex) => baseWorkouts.map((workout) => ({
      weekIndex,
      sessionIndex: workout.sessionIndex,
      title: workout.title,
      exercises: workout.exercises.map((exercise) => ({ ...exercise })),
    })),
  ).flat();

  const program: TrainingProgramDefinition = {
    version: TRAINING_PROGRAM_VERSION,
    goal: input.profile.goal,
    weeks: TRAINING_PROGRAM_WEEKS,
    sessionsPerWeek: input.profile.sessionsPerWeek,
    source: {
      generatorVersion: TRAINING_PROGRAM_VERSION,
      generatedAt: input.generatedAt,
      historyThroughDate: input.historyThroughDate,
      muscleVolumeMethodologyVersion: input.muscleVolumeMethodologyVersion,
      profileRevision: input.profile.revision,
      constraintRevision: input.constraintRevision ?? 0,
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
