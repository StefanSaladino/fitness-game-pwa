export const TRAINING_PROGRAM_VERSION = 'training-program-v1' as const;
export const TRAINING_PROGRAM_WEEKS = 4 as const;
export const TRAINING_PROGRAM_MIN_SESSIONS_PER_WEEK = 1 as const;
export const TRAINING_PROGRAM_MAX_SESSIONS_PER_WEEK = 6 as const;
export const TRAINING_PROGRAM_MAX_EXERCISES_PER_WORKOUT = 8 as const;
export const TRAINING_PROGRAM_MAX_WORKING_SETS_PER_EXERCISE = 8 as const;
export const TRAINING_PROGRAM_MAX_REPS = 30 as const;

export type TrainingProgramGoal = 'STRENGTH' | 'HYPERTROPHY' | 'BALANCED';
export type TrainingProgramStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TrainingProgramMeasurementType = 'WEIGHT_REPS' | 'BODYWEIGHT_REPS';
export type TrainingProgramBodyweightMode = 'BODYWEIGHT' | 'ADDED_WEIGHT' | 'ASSISTED';

export interface TrainingProgramSourceSnapshot {
  generatorVersion: typeof TRAINING_PROGRAM_VERSION;
  generatedAt: string;
  historyThroughDate: string;
  muscleVolumeMethodologyVersion: string;
  profileRevision: number;
  constraintRevision: number;
}

export interface TrainingProgramExercisePrescription {
  exerciseId: string;
  canonicalName: string;
  measurementType: TrainingProgramMeasurementType;
  orderIndex: number;
  workingSets: number;
  repsMin: number;
  repsMax: number;
  targetWeightKg: number | null;
  bodyweightMode: TrainingProgramBodyweightMode | null;
  supersetGroupIndex: number | null;
  supersetOrder: number | null;
}

export interface TrainingProgramWorkoutTemplate {
  weekIndex: number;
  sessionIndex: number;
  title: string;
  exercises: TrainingProgramExercisePrescription[];
}

export interface TrainingProgramDefinition {
  version: typeof TRAINING_PROGRAM_VERSION;
  goal: TrainingProgramGoal;
  weeks: typeof TRAINING_PROGRAM_WEEKS;
  sessionsPerWeek: number;
  source: TrainingProgramSourceSnapshot;
  workouts: TrainingProgramWorkoutTemplate[];
}

export type TrainingProgramValidationCode =
  | 'VERSION' | 'WEEKS' | 'FREQUENCY' | 'WORKOUT_COUNT' | 'WORKOUT_SLOT'
  | 'DUPLICATE_WORKOUT_SLOT' | 'WORKOUT_TITLE' | 'EXERCISE_COUNT' | 'EXERCISE_ID'
  | 'DUPLICATE_EXERCISE' | 'EXERCISE_ORDER' | 'SET_COUNT' | 'REP_RANGE'
  | 'LOAD_MODE' | 'LOAD_VALUE' | 'SUPERSET';

export interface TrainingProgramValidationIssue {
  code: TrainingProgramValidationCode;
  message: string;
}

function integerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateTrainingProgramDefinition(program: TrainingProgramDefinition): TrainingProgramValidationIssue[] {
  const issues: TrainingProgramValidationIssue[] = [];
  if (program.version !== TRAINING_PROGRAM_VERSION) issues.push({ code: 'VERSION', message: `Program version must be ${TRAINING_PROGRAM_VERSION}.` });
  if (program.weeks !== TRAINING_PROGRAM_WEEKS) issues.push({ code: 'WEEKS', message: `Program blocks must contain ${TRAINING_PROGRAM_WEEKS} weeks.` });
  if (!integerInRange(program.sessionsPerWeek, TRAINING_PROGRAM_MIN_SESSIONS_PER_WEEK, TRAINING_PROGRAM_MAX_SESSIONS_PER_WEEK)) {
    issues.push({ code: 'FREQUENCY', message: `Sessions per week must be ${TRAINING_PROGRAM_MIN_SESSIONS_PER_WEEK}-${TRAINING_PROGRAM_MAX_SESSIONS_PER_WEEK}.` });
  }

  const expectedWorkoutCount = program.weeks * program.sessionsPerWeek;
  if (program.workouts.length !== expectedWorkoutCount) issues.push({ code: 'WORKOUT_COUNT', message: `Expected ${expectedWorkoutCount} workout templates, found ${program.workouts.length}.` });
  const workoutSlots = new Set<string>();

  for (const workout of program.workouts) {
    const slotKey = `${workout.weekIndex}:${workout.sessionIndex}`;
    if (!integerInRange(workout.weekIndex, 0, TRAINING_PROGRAM_WEEKS - 1) || !integerInRange(workout.sessionIndex, 0, Math.max(0, program.sessionsPerWeek - 1))) {
      issues.push({ code: 'WORKOUT_SLOT', message: `Workout slot ${slotKey} is outside the program schedule.` });
    }
    if (workoutSlots.has(slotKey)) issues.push({ code: 'DUPLICATE_WORKOUT_SLOT', message: `Duplicate workout slot ${slotKey}.` });
    workoutSlots.add(slotKey);
    if (!workout.title.trim()) issues.push({ code: 'WORKOUT_TITLE', message: `Workout ${slotKey} requires a title.` });
    if (workout.exercises.length < 1 || workout.exercises.length > TRAINING_PROGRAM_MAX_EXERCISES_PER_WORKOUT) {
      issues.push({ code: 'EXERCISE_COUNT', message: `Workout ${slotKey} must contain 1-${TRAINING_PROGRAM_MAX_EXERCISES_PER_WORKOUT} exercises.` });
    }

    const exerciseIds = new Set<string>();
    const orderIndexes = new Set<number>();
    const supersetMembers = new Map<number, Set<number>>();

    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId.trim()) issues.push({ code: 'EXERCISE_ID', message: `Workout ${slotKey} contains an empty exercise id.` });
      if (exerciseIds.has(exercise.exerciseId)) issues.push({ code: 'DUPLICATE_EXERCISE', message: `Workout ${slotKey} repeats exercise ${exercise.exerciseId}.` });
      exerciseIds.add(exercise.exerciseId);

      if (!integerInRange(exercise.orderIndex, 0, TRAINING_PROGRAM_MAX_EXERCISES_PER_WORKOUT - 1) || orderIndexes.has(exercise.orderIndex)) {
        issues.push({ code: 'EXERCISE_ORDER', message: `${exercise.canonicalName} has an invalid or duplicate order index.` });
      }
      orderIndexes.add(exercise.orderIndex);

      if (!integerInRange(exercise.workingSets, 1, TRAINING_PROGRAM_MAX_WORKING_SETS_PER_EXERCISE)) issues.push({ code: 'SET_COUNT', message: `${exercise.canonicalName} has an invalid working-set count.` });
      if (!integerInRange(exercise.repsMin, 1, TRAINING_PROGRAM_MAX_REPS) || !integerInRange(exercise.repsMax, 1, TRAINING_PROGRAM_MAX_REPS) || exercise.repsMin > exercise.repsMax) {
        issues.push({ code: 'REP_RANGE', message: `${exercise.canonicalName} has an invalid repetition range.` });
      }

      if (exercise.measurementType === 'WEIGHT_REPS') {
        if (exercise.bodyweightMode !== null) issues.push({ code: 'LOAD_MODE', message: `${exercise.canonicalName} cannot use a bodyweight load mode.` });
        if (exercise.targetWeightKg !== null && exercise.targetWeightKg <= 0) issues.push({ code: 'LOAD_VALUE', message: `${exercise.canonicalName} target weight must be positive when supplied.` });
      } else {
        if (exercise.bodyweightMode === null) issues.push({ code: 'LOAD_MODE', message: `${exercise.canonicalName} requires an explicit bodyweight load mode.` });
        if (exercise.bodyweightMode === 'BODYWEIGHT' && exercise.targetWeightKg !== null) issues.push({ code: 'LOAD_VALUE', message: `${exercise.canonicalName} plain bodyweight mode cannot prescribe external load.` });
        if (exercise.bodyweightMode !== null && exercise.bodyweightMode !== 'BODYWEIGHT' && exercise.targetWeightKg !== null && exercise.targetWeightKg <= 0) {
          issues.push({ code: 'LOAD_VALUE', message: `${exercise.canonicalName} external load must be positive when supplied.` });
        }
      }

      const hasGroup = exercise.supersetGroupIndex !== null;
      const hasOrder = exercise.supersetOrder !== null;
      if (hasGroup !== hasOrder) {
        issues.push({ code: 'SUPERSET', message: `${exercise.canonicalName} must define both Superset group and order or neither.` });
      } else if (hasGroup && hasOrder) {
        if (!Number.isInteger(exercise.supersetGroupIndex) || exercise.supersetGroupIndex! < 0 || !Number.isInteger(exercise.supersetOrder) || exercise.supersetOrder! < 0) {
          issues.push({ code: 'SUPERSET', message: `${exercise.canonicalName} has invalid Superset metadata.` });
        } else {
          const orders = supersetMembers.get(exercise.supersetGroupIndex!) ?? new Set<number>();
          if (orders.has(exercise.supersetOrder!)) issues.push({ code: 'SUPERSET', message: `Workout ${slotKey} repeats a Superset member order.` });
          orders.add(exercise.supersetOrder!);
          supersetMembers.set(exercise.supersetGroupIndex!, orders);
        }
      }
    }

    const sortedOrder = [...orderIndexes].sort((a, b) => a - b);
    if (sortedOrder.length === workout.exercises.length && sortedOrder.some((value, index) => value !== index)) {
      issues.push({ code: 'EXERCISE_ORDER', message: `Workout ${slotKey} exercise order must be contiguous from zero.` });
    }

    for (const [groupIndex, orders] of supersetMembers) {
      const sorted = [...orders].sort((a, b) => a - b);
      if (sorted.length < 2 || sorted.some((value, index) => value !== index)) {
        issues.push({ code: 'SUPERSET', message: `Superset group ${groupIndex} in workout ${slotKey} must contain at least two contiguous members.` });
      }
    }
  }

  return issues;
}

export function isValidTrainingProgramDefinition(program: TrainingProgramDefinition): boolean {
  return validateTrainingProgramDefinition(program).length === 0;
}
