/**
 * Maintainer boundary: versioned exercise-level selection intent.
 * EXCLUDE is hard; PREFER is only a ranking hint. PHYSICAL_LIMITATION records
 * user exclusion intent and must never be interpreted as diagnosis or proof that
 * an alternative exercise is medically safe.
 */

export type TrainingProgramConstraintKind = 'EXCLUDE' | 'PREFER';

export type TrainingProgramConstraintReason =
  | 'PREFERENCE'
  | 'PHYSICAL_LIMITATION'
  | 'UNAVAILABLE'
  | 'OTHER';

export interface TrainingProgramExerciseConstraint {
  exerciseId: string;
  kind: TrainingProgramConstraintKind;
  reason: TrainingProgramConstraintReason;
}

export interface TrainingProgramConstraintSnapshot {
  revision: number;
  entries: TrainingProgramExerciseConstraint[];
}

function validateEntry(entry: TrainingProgramExerciseConstraint): void {
  if (!entry.exerciseId.trim()) {
    throw new Error('Training program constraint requires an exercise id.');
  }

  if (entry.kind !== 'EXCLUDE' && entry.kind !== 'PREFER') {
    throw new Error('Training program constraint kind is invalid.');
  }

  if (
    entry.reason !== 'PREFERENCE'
    && entry.reason !== 'PHYSICAL_LIMITATION'
    && entry.reason !== 'UNAVAILABLE'
    && entry.reason !== 'OTHER'
  ) {
    throw new Error('Training program constraint reason is invalid.');
  }

  if (entry.kind === 'PREFER' && entry.reason !== 'PREFERENCE') {
    throw new Error(
      'Preferred exercises may only use the PREFERENCE reason.',
    );
  }
}

export function normalizeTrainingProgramConstraintEntries(
  entries: readonly TrainingProgramExerciseConstraint[],
): TrainingProgramExerciseConstraint[] {
  if (entries.length > 200) {
    throw new RangeError(
      'Training program constraints cannot exceed 200 exercises.',
    );
  }

  const seen = new Set<string>();
  const normalized = entries.map((entry) => {
    validateEntry(entry);

    const exerciseId = entry.exerciseId.trim();
    if (seen.has(exerciseId)) {
      throw new Error(
        'Training program constraints cannot repeat an exercise.',
      );
    }
    seen.add(exerciseId);

    return {
      exerciseId,
      kind: entry.kind,
      reason: entry.reason,
    };
  });

  normalized.sort((left, right) =>
    left.exerciseId.localeCompare(right.exerciseId),
  );

  return normalized;
}

export function normalizeTrainingProgramConstraintSnapshot(
  revision: number,
  entries: readonly TrainingProgramExerciseConstraint[],
): TrainingProgramConstraintSnapshot {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new RangeError(
      'Training program constraint revision must be zero or greater.',
    );
  }

  const normalized = normalizeTrainingProgramConstraintEntries(entries);

  if (revision === 0 && normalized.length > 0) {
    throw new Error(
      'Unpersisted training program constraints cannot contain entries.',
    );
  }

  return {
    revision,
    entries: normalized,
  };
}

export function trainingProgramExcludedExerciseIds(
  constraints: TrainingProgramConstraintSnapshot,
): Set<string> {
  return new Set(
    constraints.entries
      .filter((entry) => entry.kind === 'EXCLUDE')
      .map((entry) => entry.exerciseId),
  );
}

export function trainingProgramPreferredExerciseIds(
  constraints: TrainingProgramConstraintSnapshot,
): Set<string> {
  return new Set(
    constraints.entries
      .filter((entry) => entry.kind === 'PREFER')
      .map((entry) => entry.exerciseId),
  );
}
