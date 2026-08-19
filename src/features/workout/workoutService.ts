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
  startOrResumeWorkout(): Promise<ActiveWorkoutSession>;
  pauseWorkout(workoutId: string): Promise<ActiveWorkoutSession>;
  resumeWorkout(workoutId: string): Promise<ActiveWorkoutSession>;
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

export function createWorkoutService(client: SupabaseClient = getSupabaseClient()): WorkoutService {
  const loadById = async (workoutId: string): Promise<ActiveWorkoutSession> => {
    const result = await client
      .from('workout_sessions')
      .select(ACTIVE_COLUMNS)
      .eq('id', workoutId)
      .single();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Workout session was not found.');
    return mapWorkout(result.data as WorkoutRow);
  };

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

    async startOrResumeWorkout() {
      const result = await client.rpc('start_or_resume_lifting_workout');
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Workout start did not return a session id.');
      return loadById(result.data);
    },

    async pauseWorkout(workoutId) {
      const result = await client.rpc('pause_lifting_workout', { p_workout_id: workoutId });
      if (result.error) throw result.error;
      return loadById(workoutId);
    },

    async resumeWorkout(workoutId) {
      const result = await client.rpc('resume_lifting_workout', { p_workout_id: workoutId });
      if (result.error) throw result.error;
      return loadById(workoutId);
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
