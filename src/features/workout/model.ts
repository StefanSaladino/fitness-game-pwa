export type WorkoutSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ActiveWorkoutSession {
  id: string;
  userId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  endedAt: string | null;
  activeDurationSeconds: number;
  timezoneAtStart: string;
  scoringDate: string;
  pausedAt: string | null;
  lastResumedAt: string | null;
}

export type WorkoutLifecycleAction = 'start' | 'pause' | 'resume' | 'finish' | 'cancel' | null;

export type ExerciseMeasurementType = 'WEIGHT_REPS' | 'BODYWEIGHT_REPS' | 'DURATION' | 'OTHER';

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroupId: string | null;
  supersetOrder: number | null;
  revision: number;
  canonicalName: string;
  measurementType: ExerciseMeasurementType;
}

export type WorkoutCompositionAction = 'add' | 'remove' | 'move' | 'superset' | null;


export type ExerciseMuscleGroup =
  | 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS' | 'QUADS' | 'HAMSTRINGS'
  | 'GLUTES' | 'CALVES' | 'CORE' | 'OBLIQUES' | 'FOREARMS_GRIP' | 'NECK' | 'FULL_BODY' | 'OTHER';

export type ExerciseWorkoutType =
  | 'BARBELL' | 'DUMBBELL' | 'KETTLEBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT'
  | 'ISOMETRIC' | 'PLYOMETRIC' | 'MEDICINE_BALL' | 'LANDMINE' | 'BAND'
  | 'STRONGMAN_CARRY_SLED' | 'OLYMPIC_POWER' | 'SPECIALTY' | 'OTHER';

export interface ExercisePickerItem {
  id: string;
  canonicalName: string;
  measurementType: ExerciseMeasurementType;
  primaryMuscleGroup: ExerciseMuscleGroup;
  workoutType: ExerciseWorkoutType;
  aliases: string[];
  lastUsedAt: string | null;
}

export type ExerciseBrowseMode = 'muscle' | 'type';

export type WorkoutSetType = 'WARMUP' | 'WORKING' | 'DROP' | 'FAILURE';
export type BodyweightLoadMode = 'BODYWEIGHT' | 'ADDED_WEIGHT' | 'ASSISTED';
export type WeightDisplayUnit = 'KG' | 'LB';

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  bodyweightMode: BodyweightLoadMode | null;
  completed: boolean;
  completedAt: string | null;
  revision: number;
}

export interface WorkoutSetInput {
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  bodyweightMode: BodyweightLoadMode | null;
  completed: boolean;
}

export type WorkoutSetAction = 'add' | 'copy' | 'save' | 'remove' | null;
