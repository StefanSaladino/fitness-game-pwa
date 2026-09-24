import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeTrainingProgramConstraintEntries,
  normalizeTrainingProgramConstraintSnapshot,
  type TrainingProgramConstraintSnapshot,
  type TrainingProgramExerciseConstraint,
} from '../../domain/trainingProgramConstraints';
import { getSupabaseClient } from '../../lib/supabase';

type ConstraintPayload = {
  revision?: unknown;
  entries?: unknown;
};

function mapEntry(value: unknown): TrainingProgramExerciseConstraint {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Training program constraint returned an invalid entry.');
  }

  const row = value as Record<string, unknown>;
  if (typeof row.exerciseId !== 'string' || !row.exerciseId.trim()) {
    throw new Error(
      'Training program constraint returned an invalid exercise id.',
    );
  }

  if (row.kind !== 'EXCLUDE' && row.kind !== 'PREFER') {
    throw new Error('Training program constraint returned an invalid kind.');
  }

  if (
    row.reason !== 'PREFERENCE'
    && row.reason !== 'PHYSICAL_LIMITATION'
    && row.reason !== 'UNAVAILABLE'
    && row.reason !== 'OTHER'
  ) {
    throw new Error('Training program constraint returned an invalid reason.');
  }

  return {
    exerciseId: row.exerciseId,
    kind: row.kind,
    reason: row.reason,
  };
}

function mapSnapshot(value: unknown): TrainingProgramConstraintSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Training program constraints returned an invalid payload.');
  }

  const payload = value as ConstraintPayload;
  const revision = Number(payload.revision);
  if (!Array.isArray(payload.entries)) {
    throw new Error('Training program constraints returned invalid entries.');
  }

  return normalizeTrainingProgramConstraintSnapshot(
    revision,
    payload.entries.map(mapEntry),
  );
}

export interface ReplaceTrainingProgramConstraintsInput {
  entries: readonly TrainingProgramExerciseConstraint[];
  expectedRevision: number;
}

export interface TrainingProgramConstraintService {
  load(): Promise<TrainingProgramConstraintSnapshot>;
  replace(
    input: ReplaceTrainingProgramConstraintsInput,
  ): Promise<TrainingProgramConstraintSnapshot>;
}

export function createTrainingProgramConstraintService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingProgramConstraintService {
  return {
    async load() {
      const result = await client.rpc(
        'get_my_training_program_constraints',
      );

      if (result.error) throw result.error;
      return mapSnapshot(result.data);
    },

    async replace(input) {
      if (
        !Number.isSafeInteger(input.expectedRevision)
        || input.expectedRevision < 0
      ) {
        throw new RangeError(
          'Training program constraint revision must be zero or greater.',
        );
      }

      const entries = normalizeTrainingProgramConstraintEntries(
        input.entries,
      );

      const result = await client.rpc(
        'replace_my_training_program_exercise_constraints',
        {
          p_constraints: entries,
          p_expected_revision: input.expectedRevision,
        },
      );

      if (result.error) throw result.error;
      return mapSnapshot(result.data);
    },
  };
}
