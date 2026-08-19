export type WorkoutCategory =
  | 'STRENGTH'
  | 'RUNNING'
  | 'WALKING_HIKING'
  | 'CYCLING'
  | 'SWIMMING'
  | 'SPORT'
  | 'CARDIO'
  | 'HIIT'
  | 'MOBILITY'
  | 'OTHER';

export type CardioBonusCategory = Exclude<WorkoutCategory, 'STRENGTH' | 'MOBILITY' | 'OTHER'>;
export type WorkoutStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkoutSource = 'MANUAL' | 'IN_APP' | 'EXTERNAL';
export type ExerciseBaselineState = 'UNSEEN' | 'ESTABLISHED';

export interface StrengthSetInput {
  setType: 'WARMUP' | 'WORKING';
  completed: boolean;
  reps: number;
  weightKg?: number;
}

export interface WorkoutQualificationInput {
  category: WorkoutCategory;
  status: WorkoutStatus;
  source: WorkoutSource;
  activeDurationSeconds: number;
  strengthSets?: readonly StrengthSetInput[];
}

export interface ExerciseCompletionInput {
  exerciseId: string;
  completedWorkingSetCount: number;
}

export interface DailyXpBreakdown {
  liftingWorkoutXp: number;
  exerciseXp: number;
  progressionXp: number;
  cardioBonusXp: number;
}
