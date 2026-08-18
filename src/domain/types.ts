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

export type WorkoutStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkoutSource = 'MANUAL' | 'IN_APP' | 'EXTERNAL';
export type BenchmarkState = 'UNSEEN' | 'CALIBRATING' | 'ESTABLISHED';

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
