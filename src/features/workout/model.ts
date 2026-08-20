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
  canonicalName: string;
  measurementType: ExerciseMeasurementType;
}

export type WorkoutCompositionAction = 'add' | 'remove' | 'move' | null;


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
