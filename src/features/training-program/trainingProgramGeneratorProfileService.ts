import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { TrainingProgramGoal } from '../../domain/trainingProgram';
import {
  normalizeTrainingProgramEquipmentKeys,
  validateTrainingProgramAccessSelection,
  type TrainingProgramAccessMode,
  type TrainingProgramEquipmentKey,
} from '../../domain/trainingProgramEquipment';

export interface TrainingProgramGeneratorProfile {
  userId: string;
  accessMode: TrainingProgramAccessMode;
  equipmentKeys: TrainingProgramEquipmentKey[];
  goal: TrainingProgramGoal | null;
  sessionsPerWeek: number | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgramGenerationPreferenceUpdate {
  goal: TrainingProgramGoal;
  sessionsPerWeek: number;
  expectedRevision: number;
}

type ProfileRow = {
  user_id: unknown;
  access_mode: unknown;
  equipment_keys: unknown;
  goal: unknown;
  sessions_per_week: unknown;
  revision: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function mapProfile(row: ProfileRow): TrainingProgramGeneratorProfile {
  if (typeof row.user_id !== 'string' || !row.user_id) {
    throw new Error('Training program profile returned an invalid user id.');
  }

  if (row.access_mode !== 'COMMERCIAL_GYM' && row.access_mode !== 'CUSTOM') {
    throw new Error('Training program profile returned an invalid access mode.');
  }

  if (
    !Array.isArray(row.equipment_keys)
    || row.equipment_keys.some((key) => typeof key !== 'string')
  ) {
    throw new Error('Training program profile returned invalid equipment.');
  }

  const equipmentKeys = normalizeTrainingProgramEquipmentKeys(
    row.equipment_keys as string[],
  );
  validateTrainingProgramAccessSelection(row.access_mode, equipmentKeys);

  const goal = row.goal === null
    ? null
    : row.goal === 'STRENGTH'
      || row.goal === 'HYPERTROPHY'
      || row.goal === 'BALANCED'
      ? row.goal
      : null;

  if (row.goal !== null && goal === null) {
    throw new Error('Training program profile returned an invalid goal.');
  }

  const sessionsPerWeek = row.sessions_per_week === null
    ? null
    : Number(row.sessions_per_week);

  if (
    sessionsPerWeek !== null
    && (
      !Number.isInteger(sessionsPerWeek)
      || sessionsPerWeek < 1
      || sessionsPerWeek > 6
    )
  ) {
    throw new Error('Training program profile returned an invalid weekly frequency.');
  }

  if ((goal === null) !== (sessionsPerWeek === null)) {
    throw new Error('Training program profile returned incomplete generation preferences.');
  }

  const revision = Number(row.revision);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('Training program profile returned an invalid revision.');
  }

  if (typeof row.created_at !== 'string' || typeof row.updated_at !== 'string') {
    throw new Error('Training program profile returned invalid timestamps.');
  }

  return {
    userId: row.user_id,
    accessMode: row.access_mode,
    equipmentKeys,
    goal,
    sessionsPerWeek,
    revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRpcResponse(data: unknown): ProfileRow {
  const response = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Training program profile returned an invalid response.');
  }
  return response as ProfileRow;
}

export interface TrainingProgramGeneratorProfileService {
  load(userId: string): Promise<TrainingProgramGeneratorProfile | null>;
  updatePreferences(
    input: TrainingProgramGenerationPreferenceUpdate,
  ): Promise<TrainingProgramGeneratorProfile>;
}

export function createTrainingProgramGeneratorProfileService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramGeneratorProfileService {
  const columns = [
    'user_id',
    'access_mode',
    'equipment_keys',
    'goal',
    'sessions_per_week',
    'revision',
    'created_at',
    'updated_at',
  ].join(', ');

  return {
    async load(userId) {
      const result = await client
        .from('training_program_profiles')
        .select(columns)
        .eq('user_id', userId)
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) return null;
      return mapProfile(result.data as unknown as ProfileRow);
    },

    async updatePreferences(input) {
      if (
        !Number.isSafeInteger(input.expectedRevision)
        || input.expectedRevision < 1
      ) {
        throw new RangeError(
          'Training program profile revision must be one or greater.',
        );
      }

      if (
        !Number.isInteger(input.sessionsPerWeek)
        || input.sessionsPerWeek < 1
        || input.sessionsPerWeek > 6
      ) {
        throw new RangeError(
          'Training program sessions per week must be between 1 and 6.',
        );
      }

      const result = await client.rpc(
        'update_my_training_program_generation_preferences',
        {
          p_goal: input.goal,
          p_sessions_per_week: input.sessionsPerWeek,
          p_expected_revision: input.expectedRevision,
        },
      );

      if (result.error) throw result.error;
      return mapProfile(normalizeRpcResponse(result.data));
    },
  };
}
