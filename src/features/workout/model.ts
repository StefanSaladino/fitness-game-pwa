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
