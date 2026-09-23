import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  TrainingProgramCandidateContribution,
  TrainingProgramGeneratorCandidate,
  TrainingProgramMuscleGroup,
} from '../../domain/trainingProgramGenerator';

type CandidateRow = {
  exercise_id: unknown;
  canonical_name: unknown;
  measurement_type: unknown;
  primary_muscle_group: unknown;
  workout_type: unknown;
  supports_added_weight: unknown;
  supports_assisted: unknown;
  volume_eligible: unknown;
  contributions: unknown;
};

function contributionMuscleGroup(value: unknown): TrainingProgramMuscleGroup {
  if (
    typeof value === 'string'
    && [
      'CHEST',
      'LATS',
      'UPPER_BACK',
      'TRAPS',
      'SPINAL_ERECTORS',
      'ANTERIOR_DELTS',
      'LATERAL_DELTS',
      'POSTERIOR_DELTS',
      'BICEPS',
      'TRICEPS',
      'QUADS',
      'HAMSTRINGS',
      'GLUTES',
      'CALVES',
      'FOREARMS_GRIP',
      'CORE',
      'OBLIQUES',
      'NECK',
    ].includes(value)
  ) {
    return value as TrainingProgramMuscleGroup;
  }

  throw new Error(
    `Training program candidate returned an invalid contribution muscle group: ${String(value)}`,
  );
}

function mapContributions(
  value: unknown,
): TrainingProgramCandidateContribution[] {
  if (!Array.isArray(value)) {
    throw new Error(
      'Training program candidate returned invalid contribution metadata.',
    );
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(
        'Training program candidate returned invalid contribution metadata.',
      );
    }

    const record = entry as Record<string, unknown>;
    if (record.role !== 'DIRECT' && record.role !== 'INDIRECT') {
      throw new Error(
        'Training program candidate returned an invalid contribution role.',
      );
    }

    const weight = Number(record.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(
        'Training program candidate returned an invalid contribution weight.',
      );
    }

    return {
      muscleGroup: contributionMuscleGroup(record.muscleGroup),
      role: record.role,
      weight,
    };
  });
}

function mapCandidate(row: CandidateRow): TrainingProgramGeneratorCandidate {
  if (typeof row.exercise_id !== 'string' || !row.exercise_id) {
    throw new Error('Training program candidate returned an invalid exercise id.');
  }

  if (
    typeof row.canonical_name !== 'string'
    || !row.canonical_name.trim()
  ) {
    throw new Error(
      'Training program candidate returned an invalid exercise name.',
    );
  }

  if (
    typeof row.measurement_type !== 'string'
    || typeof row.primary_muscle_group !== 'string'
    || typeof row.workout_type !== 'string'
  ) {
    throw new Error(
      'Training program candidate returned invalid exercise metadata.',
    );
  }

  if (
    typeof row.supports_added_weight !== 'boolean'
    || typeof row.supports_assisted !== 'boolean'
    || typeof row.volume_eligible !== 'boolean'
  ) {
    throw new Error(
      'Training program candidate returned invalid capability metadata.',
    );
  }

  return {
    exerciseId: row.exercise_id,
    canonicalName: row.canonical_name,
    measurementType: row.measurement_type,
    primaryMuscleGroup: row.primary_muscle_group,
    workoutType: row.workout_type,
    supportsAddedWeight: row.supports_added_weight,
    supportsAssisted: row.supports_assisted,
    volumeEligible: row.volume_eligible,
    contributions: mapContributions(row.contributions),
  };
}

export interface TrainingProgramCandidateService {
  load(): Promise<TrainingProgramGeneratorCandidate[]>;
}

export function createTrainingProgramCandidateService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramCandidateService {
  return {
    async load() {
      const result = await client.rpc(
        'get_my_training_program_candidate_catalog',
      );

      if (result.error) throw result.error;
      return ((result.data ?? []) as CandidateRow[]).map(mapCandidate);
    },
  };
}
