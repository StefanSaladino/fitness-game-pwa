import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  normalizeTrainingProgramEquipmentKeys,
  validateTrainingProgramAccessSelection,
  type TrainingProgramAccessMode,
  type TrainingProgramEquipmentKey,
} from '../../domain/trainingProgramEquipment';

export interface TrainingProgramProfile {
  userId: string;
  accessMode: TrainingProgramAccessMode;
  equipmentKeys: TrainingProgramEquipmentKey[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgramProfileUpdate {
  accessMode: TrainingProgramAccessMode;
  equipmentKeys: readonly string[];
  expectedRevision: number;
}

type TrainingProgramProfileRow = {
  user_id: unknown;
  access_mode: unknown;
  equipment_keys: unknown;
  revision: unknown;
  created_at: unknown;
  updated_at: unknown;
};

export interface TrainingProgramProfileService {
  load(userId: string): Promise<TrainingProgramProfile | null>;
  update(input: TrainingProgramProfileUpdate): Promise<TrainingProgramProfile>;
}

function mapProfile(row: TrainingProgramProfileRow): TrainingProgramProfile {
  if (typeof row.user_id !== 'string' || !row.user_id) {
    throw new Error('Training program profile returned an invalid user id.');
  }
  if (row.access_mode !== 'COMMERCIAL_GYM' && row.access_mode !== 'CUSTOM') {
    throw new Error('Training program profile returned an invalid access mode.');
  }
  if (!Array.isArray(row.equipment_keys) || row.equipment_keys.some((key) => typeof key !== 'string')) {
    throw new Error('Training program profile returned invalid equipment.');
  }

  const equipmentKeys = normalizeTrainingProgramEquipmentKeys(row.equipment_keys as string[]);
  validateTrainingProgramAccessSelection(row.access_mode, equipmentKeys);

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
    revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRpcResponse(data: unknown): TrainingProgramProfileRow {
  const response = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Training program profile returned an invalid response.');
  }
  return response as TrainingProgramProfileRow;
}

export function createTrainingProgramProfileService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramProfileService {
  const columns = 'user_id, access_mode, equipment_keys, revision, created_at, updated_at';

  return {
    async load(userId) {
      const result = await client
        .from('training_program_profiles')
        .select(columns)
        .eq('user_id', userId)
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) return null;
      return mapProfile(result.data as unknown as TrainingProgramProfileRow);
    },

    async update(input) {
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
        throw new RangeError('Training program profile revision must be zero or greater.');
      }
      const equipmentKeys = validateTrainingProgramAccessSelection(
        input.accessMode,
        input.equipmentKeys,
      );

      const result = await client.rpc('update_my_training_program_access_profile', {
        p_access_mode: input.accessMode,
        p_equipment_keys: equipmentKeys,
        p_expected_revision: input.expectedRevision,
      });

      if (result.error) throw result.error;
      return mapProfile(normalizeRpcResponse(result.data));
    },
  };
}
