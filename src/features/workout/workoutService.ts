import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { ActiveWorkoutSession } from './model';

type WorkoutRow = {
  id: string;
  user_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  started_at: string;
  ended_at: string | null;
  active_duration_seconds: number;
  timezone_at_start: string;
  scoring_date: string;
  paused_at: string | null;
  last_resumed_at: string | null;
};

const ACTIVE_COLUMNS = 'id, user_id, status, started_at, ended_at, active_duration_seconds, timezone_at_start, scoring_date, paused_at, last_resumed_at';

export interface WorkoutService {
  loadActiveWorkout(userId: string): Promise<ActiveWorkoutSession | null>;
  startOrResumeWorkout(actionAtMs?: number): Promise<ActiveWorkoutSession>;
  startPresetWorkout(exerciseIds: string[], actionAtMs?: number): Promise<ActiveWorkoutSession>;
  pauseWorkout(workoutId: string, actionAtMs?: number): Promise<ActiveWorkoutSession>;
  resumeWorkout(workoutId: string, actionAtMs?: number): Promise<ActiveWorkoutSession>;
  finishWorkout(workoutId: string): Promise<void>;
  cancelWorkout(workoutId: string): Promise<void>;
}

function mapWorkout(row: WorkoutRow): ActiveWorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    activeDurationSeconds: row.active_duration_seconds,
    timezoneAtStart: row.timezone_at_start,
    scoringDate: row.scoring_date,
    pausedAt: row.paused_at,
    lastResumedAt: row.last_resumed_at,
  };
}

function mapRpcWorkout(data: unknown): ActiveWorkoutSession {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Workout lifecycle did not return a session snapshot.');
  }
  const row = data as Partial<WorkoutRow>;
  if (
    typeof row.id !== 'string'
    || typeof row.user_id !== 'string'
    || typeof row.status !== 'string'
    || typeof row.started_at !== 'string'
    || typeof row.active_duration_seconds !== 'number'
    || typeof row.timezone_at_start !== 'string'
    || typeof row.scoring_date !== 'string'
  ) {
    throw new Error('Workout lifecycle returned an invalid session snapshot.');
  }
  return mapWorkout(row as WorkoutRow);
}

function actionTimestamp(actionAtMs?: number): string {
  const value = Number.isFinite(actionAtMs) ? actionAtMs! : Date.now();
  return new Date(value).toISOString();
}

export function createWorkoutService(client: SupabaseClient = getSupabaseClient()): WorkoutService {
  return {
    async loadActiveWorkout(userId) {
      const result = await client
        .from('workout_sessions')
        .select(ACTIVE_COLUMNS)
        .eq('user_id', userId)
        .eq('category', 'STRENGTH')
        .eq('source', 'IN_APP')
        .eq('status', 'IN_PROGRESS')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (result.error) throw result.error;
      return result.data ? mapWorkout(result.data as WorkoutRow) : null;
    },

    async startOrResumeWorkout(actionAtMs) {
      const result = await client.rpc('start_or_resume_lifting_workout_intent', {
        p_action_at: actionTimestamp(actionAtMs),
      });
      if (result.error) throw result.error;
      return mapRpcWorkout(result.data);
    },

    async startPresetWorkout(exerciseIds, actionAtMs) {
      const result = await client.rpc('start_lifting_workout_from_preset', {
        p_exercise_ids: exerciseIds,
        p_action_at: actionTimestamp(actionAtMs),
      });
      if (result.error) throw result.error;
      return mapRpcWorkout(result.data);
    },

    async pauseWorkout(workoutId, actionAtMs) {
      const result = await client.rpc('pause_lifting_workout_intent', {
        p_workout_id: workoutId,
        p_action_at: actionTimestamp(actionAtMs),
      });
      if (result.error) throw result.error;
      return mapRpcWorkout(result.data);
    },

    async resumeWorkout(workoutId, actionAtMs) {
      const result = await client.rpc('resume_lifting_workout_intent', {
        p_workout_id: workoutId,
        p_action_at: actionTimestamp(actionAtMs),
      });
      if (result.error) throw result.error;
      return mapRpcWorkout(result.data);
    },

    async finishWorkout(workoutId) {
      const result = await client.rpc('finish_lifting_workout', { p_workout_id: workoutId });
      if (result.error) throw result.error;
    },

    async cancelWorkout(workoutId) {
      const result = await client.rpc('cancel_lifting_workout', { p_workout_id: workoutId });
      if (result.error) throw result.error;
    },
  };
}
