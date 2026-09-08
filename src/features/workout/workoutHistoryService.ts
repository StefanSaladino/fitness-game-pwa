import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  BodyweightLoadMode,
  ExerciseMeasurementType,
  WorkoutSetType,
} from './model';
import type {
  WorkoutHistoryExercise,
  WorkoutHistorySession,
  WorkoutHistorySet,
} from './workoutHistoryModel';

type SessionRow = {
  id: string;
  scoring_date: string;
  started_at: string;
  ended_at: string | null;
  active_duration_seconds: number;
};

type ExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  superset_group_id: string | null;
  superset_order: number | null;
};

type CatalogRow = {
  id: string;
  canonical_name: string;
  measurement_type: ExerciseMeasurementType;
};

type SetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: WorkoutSetType;
  weight_kg: number | string | null;
  reps: number | null;
  bodyweight_mode: BodyweightLoadMode | null;
};

const SESSION_COLUMNS = 'id, scoring_date, started_at, ended_at, active_duration_seconds';
const EXERCISE_COLUMNS = 'id, workout_id, exercise_id, order_index, superset_group_id, superset_order';
const CATALOG_COLUMNS = 'id, canonical_name, measurement_type';
const SET_COLUMNS = 'id, workout_exercise_id, set_number, set_type, weight_kg, reps, bodyweight_mode';

export interface WorkoutHistoryService {
  load(userId: string): Promise<WorkoutHistorySession[]>;
}

function mapSet(row: SetRow): WorkoutHistorySet {
  return {
    id: row.id,
    setNumber: row.set_number,
    setType: row.set_type,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
    bodyweightMode: row.bodyweight_mode,
  };
}

export function createWorkoutHistoryService(
  client: SupabaseClient = getSupabaseClient(),
): WorkoutHistoryService {
  return {
    async load(userId) {
      const sessionsResult = await client
        .from('workout_sessions')
        .select(SESSION_COLUMNS)
        .eq('user_id', userId)
        .eq('category', 'STRENGTH')
        .eq('source', 'IN_APP')
        .eq('status', 'COMPLETED')
        .order('ended_at', { ascending: false })
        .limit(10);

      if (sessionsResult.error) throw sessionsResult.error;

      const sessionRows = (sessionsResult.data ?? []) as SessionRow[];
      if (sessionRows.length === 0) return [];

      const workoutIds = sessionRows.map((row) => row.id);

      const exercisesResult = await client
        .from('workout_exercises')
        .select(EXERCISE_COLUMNS)
        .in('workout_id', workoutIds)
        .order('order_index', { ascending: true });

      if (exercisesResult.error) throw exercisesResult.error;

      const exerciseRows = (exercisesResult.data ?? []) as ExerciseRow[];
      if (exerciseRows.length === 0) {
        return sessionRows
          .filter((row): row is SessionRow & { ended_at: string } => row.ended_at !== null)
          .map((row) => ({
            id: row.id,
            scoringDate: row.scoring_date,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            activeDurationSeconds: row.active_duration_seconds,
            exercises: [],
          }));
      }

      const exerciseIds = [...new Set(exerciseRows.map((row) => row.exercise_id))];
      const workoutExerciseIds = exerciseRows.map((row) => row.id);

      const [catalogResult, setsResult] = await Promise.all([
        client
          .from('exercise_catalog')
          .select(CATALOG_COLUMNS)
          .in('id', exerciseIds),
        client
          .from('workout_sets')
          .select(SET_COLUMNS)
          .in('workout_exercise_id', workoutExerciseIds)
          .eq('completed', true)
          .order('set_number', { ascending: true }),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (setsResult.error) throw setsResult.error;

      const catalogById = new Map(
        ((catalogResult.data ?? []) as CatalogRow[]).map((row) => [row.id, row]),
      );

      const setsByExerciseId = new Map<string, WorkoutHistorySet[]>();
      for (const row of (setsResult.data ?? []) as SetRow[]) {
        const sets = setsByExerciseId.get(row.workout_exercise_id) ?? [];
        sets.push(mapSet(row));
        setsByExerciseId.set(row.workout_exercise_id, sets);
      }

      const exercisesByWorkoutId = new Map<string, WorkoutHistoryExercise[]>();
      for (const row of exerciseRows) {
        const catalog = catalogById.get(row.exercise_id);
        if (!catalog) continue;

        const exercises = exercisesByWorkoutId.get(row.workout_id) ?? [];
        exercises.push({
          id: row.id,
          exerciseId: row.exercise_id,
          canonicalName: catalog.canonical_name,
          measurementType: catalog.measurement_type,
          orderIndex: row.order_index,
          supersetGroupId: row.superset_group_id,
          supersetOrder: row.superset_order,
          sets: (setsByExerciseId.get(row.id) ?? []).sort(
            (left, right) => left.setNumber - right.setNumber,
          ),
        });
        exercisesByWorkoutId.set(row.workout_id, exercises);
      }

      return sessionRows
        .filter((row): row is SessionRow & { ended_at: string } => row.ended_at !== null)
        .map((row) => ({
          id: row.id,
          scoringDate: row.scoring_date,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          activeDurationSeconds: row.active_duration_seconds,
          exercises: (exercisesByWorkoutId.get(row.id) ?? []).sort(
            (left, right) => left.orderIndex - right.orderIndex,
          ),
        }));
    },
  };
}
