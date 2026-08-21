import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import { createLiftingConsistencyService } from '../consistency';
import { scoringDateInTimezone, summarizeScoringEvents, uniqueScoringDayCount, weekBoundsForScoringDate } from './dashboardMath';
import type {
  DashboardLeaderboardEntry,
  DashboardLoadInput,
  DashboardPrMetric,
  DashboardRecentLift,
  DashboardRecentPr,
  DashboardSnapshot,
  DashboardXpEventType,
} from './model';

const PROFILE_PICTURE_BUCKET = 'profile-pictures';

type WorkoutRow = {
  id: string;
  subtype: string | null;
  scoring_date: string;
  started_at: string;
  active_duration_seconds: number;
};

type WorkoutExerciseRow = { workout_id: string; exercise_id: string };
type ScoringEventRow = { event_type: DashboardXpEventType; amount: number; workout_id: string | null; scoring_date?: string };
type ProgressRow = {
  exercise_id: string;
  metric_type: DashboardPrMetric;
  best_value: number | string;
  best_weight_kg: number | string | null;
  best_reps: number | null;
  achieved_at: string;
};
type ExerciseRow = { id: string; canonical_name: string };
type ProfilePictureRow = { profile_picture_path: string | null };
type LeaderboardRow = {
  member_user_id: string;
  username: string;
  display_name: string;
  profile_picture_path: string | null;
  xp: number | string;
};

export interface DashboardService {
  load(input: DashboardLoadInput, now?: Date): Promise<DashboardSnapshot>;
}

function numberValue(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function liftTitle(subtype: string | null): string {
  const normalized = subtype?.trim();
  return normalized ? normalized : 'Strength session';
}

export function createDashboardService(client: SupabaseClient = getSupabaseClient()): DashboardService {
  const publicPictureUrl = (path: string | null): string | null => {
    if (!path) return null;
    return client.storage.from(PROFILE_PICTURE_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  return {
    async load(input, now = new Date()) {
      const scoringDate = scoringDateInTimezone(now, input.timezone);
      const consistency = await createLiftingConsistencyService(client).load();
      const { weekStart, weekEnd } = weekBoundsForScoringDate(consistency.currentWeekStart || scoringDate);

      const [weeklyEventsResult, recentWorkoutsResult, progressResult, profileResult, leaderboardResult] = await Promise.all([
        client
          .from('scoring_events')
          .select('event_type, amount, workout_id, scoring_date')
          .eq('user_id', input.userId)
          .eq('scoring_version', 'lifting-v1')
          .gte('scoring_date', weekStart)
          .lte('scoring_date', weekEnd),
        client
          .from('workout_sessions')
          .select('id, subtype, scoring_date, started_at, active_duration_seconds')
          .eq('user_id', input.userId)
          .eq('category', 'STRENGTH')
          .eq('status', 'COMPLETED')
          .order('started_at', { ascending: false })
          .limit(4),
        client
          .from('exercise_progress')
          .select('exercise_id, metric_type, best_value, best_weight_kg, best_reps, achieved_at')
          .eq('user_id', input.userId)
          .order('achieved_at', { ascending: false })
          .limit(4),
        client
          .from('profiles')
          .select('profile_picture_path')
          .eq('id', input.userId)
          .single(),
        client.rpc('get_group_lifting_leaderboard', {
          p_group_id: input.groupId,
          p_week_start: weekStart,
        }),
      ]);

      for (const result of [weeklyEventsResult, recentWorkoutsResult, progressResult, profileResult, leaderboardResult]) {
        if (result.error) throw result.error;
      }

      const resolvedWeeklyTarget = consistency.currentWeekTarget ?? input.weeklyTarget;
      const weeklyEvents = (weeklyEventsResult.data ?? []) as ScoringEventRow[];
      const weeklySessionDates = weeklyEvents
        .filter((event) => event.event_type === 'LIFTING_WORKOUT' && typeof event.scoring_date === 'string')
        .map((event) => event.scoring_date!);
      const scoreSummary = summarizeScoringEvents(weeklyEvents.map((event) => ({ eventType: event.event_type, amount: Number(event.amount) })));
      const recentWorkoutRows = (recentWorkoutsResult.data ?? []) as WorkoutRow[];
      const progressRows = (progressResult.data ?? []) as ProgressRow[];

      const workoutIds = recentWorkoutRows.map((workout) => workout.id);
      const progressExerciseIds = [...new Set(progressRows.map((row) => row.exercise_id))];

      const [workoutExercisesResult, recentWorkoutEventsResult, exerciseNamesResult] = await Promise.all([
        workoutIds.length
          ? client.from('workout_exercises').select('workout_id, exercise_id').in('workout_id', workoutIds)
          : Promise.resolve({ data: [], error: null }),
        workoutIds.length
          ? client.from('scoring_events').select('event_type, amount, workout_id').eq('user_id', input.userId).eq('scoring_version', 'lifting-v1').in('workout_id', workoutIds)
          : Promise.resolve({ data: [], error: null }),
        progressExerciseIds.length
          ? client.from('exercise_catalog').select('id, canonical_name').in('id', progressExerciseIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      for (const result of [workoutExercisesResult, recentWorkoutEventsResult, exerciseNamesResult]) {
        if (result.error) throw result.error;
      }

      const workoutExercises = (workoutExercisesResult.data ?? []) as WorkoutExerciseRow[];
      const recentWorkoutEvents = (recentWorkoutEventsResult.data ?? []) as ScoringEventRow[];
      const exerciseNames = (exerciseNamesResult.data ?? []) as ExerciseRow[];
      const exerciseNameById = new Map(exerciseNames.map((row) => [row.id, row.canonical_name]));

      const exerciseCountByWorkout = new Map<string, Set<string>>();
      for (const row of workoutExercises) {
        const set = exerciseCountByWorkout.get(row.workout_id) ?? new Set<string>();
        set.add(row.exercise_id);
        exerciseCountByWorkout.set(row.workout_id, set);
      }

      const xpByWorkout = new Map<string, number>();
      for (const event of recentWorkoutEvents) {
        if (!event.workout_id) continue;
        xpByWorkout.set(event.workout_id, (xpByWorkout.get(event.workout_id) ?? 0) + Number(event.amount));
      }

      const recentLifts: DashboardRecentLift[] = recentWorkoutRows.map((workout) => ({
        id: workout.id,
        title: liftTitle(workout.subtype),
        scoringDate: workout.scoring_date,
        startedAt: workout.started_at,
        durationMinutes: Math.max(0, Math.round(workout.active_duration_seconds / 60)),
        exerciseCount: exerciseCountByWorkout.get(workout.id)?.size ?? 0,
        xp: xpByWorkout.get(workout.id) ?? 0,
      }));

      const recentPrs: DashboardRecentPr[] = progressRows.map((row) => ({
        exerciseId: row.exercise_id,
        exerciseName: exerciseNameById.get(row.exercise_id) ?? 'Exercise',
        metricType: row.metric_type,
        bestValue: numberValue(row.best_value) ?? 0,
        bestWeightKg: numberValue(row.best_weight_kg),
        bestReps: row.best_reps,
        achievedAt: row.achieved_at,
      }));

      const leaderboardRows = (leaderboardResult.data ?? []) as LeaderboardRow[];
      const leaderboard: DashboardLeaderboardEntry[] = leaderboardRows.map((row, index) => ({
        rank: index + 1,
        userId: row.member_user_id,
        username: row.username,
        displayName: row.display_name,
        profilePictureUrl: publicPictureUrl(row.profile_picture_path),
        xp: Number(row.xp),
        isCurrentUser: row.member_user_id === input.userId,
      }));

      const currentProfilePicturePath = (profileResult.data as ProfilePictureRow | null)?.profile_picture_path ?? null;

      return {
        weekStart,
        weekEnd,
        weeklyTarget: resolvedWeeklyTarget,
        completedLiftingDays: uniqueScoringDayCount(weeklySessionDates),
        completedLiftingDates: [...new Set(weeklySessionDates)].sort(),
        weeklyXp: scoreSummary.weeklyXp,
        xpBreakdown: scoreSummary.breakdown,
        recentLifts,
        recentPrs,
        leaderboard,
        currentUserProfilePictureUrl: publicPictureUrl(currentProfilePicturePath),
        consistency,
      };
    },
  };
}
