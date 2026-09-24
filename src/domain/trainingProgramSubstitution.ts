import type {
  TrainingProgramBodyweightMode,
  TrainingProgramExercisePrescription,
} from './trainingProgram';
import {
  isTrainingProgramCompoundCandidate,
  resolveTrainingProgramReferenceWeight,
  trainingProgramPrimaryGroupMatchesTarget,
  type TrainingProgramExerciseHistory,
  type TrainingProgramGeneratorCandidate,
  type TrainingProgramGeneratorProfile,
} from './trainingProgramGenerator';
import {
  trainingProgramExcludedExerciseIds,
  trainingProgramPreferredExerciseIds,
  type TrainingProgramConstraintSnapshot,
} from './trainingProgramConstraints';
import {
  availableTrainingProgramEquipment,
  resolveTrainingProgramExerciseRequirements,
  trainingProgramRequirementsAreAvailable,
} from './trainingProgramExerciseRequirements';

export interface TrainingProgramSubstitutionInput {
  original: TrainingProgramExercisePrescription;
  profile: TrainingProgramGeneratorProfile;
  constraints: TrainingProgramConstraintSnapshot;
  candidates: TrainingProgramGeneratorCandidate[];
  history: TrainingProgramExerciseHistory[];
  occupiedExerciseIds: readonly string[];
  temporaryExcludedExerciseIds?: readonly string[];
}

export interface TrainingProgramSubstitutionResult {
  replacement: TrainingProgramExercisePrescription;
  substitutedForExerciseId: string;
  constraintRevision: number;
}

function historyScore(
  history: TrainingProgramExerciseHistory | undefined,
): number {
  if (!history) return 0;

  return Math.min(8, Math.max(0, history.sessionCount)) * 4
    + Math.min(12, Math.max(0, history.observationCount));
}

function supportsBodyweightMode(
  candidate: TrainingProgramGeneratorCandidate,
  mode: TrainingProgramBodyweightMode | null,
): boolean {
  if (candidate.measurementType !== 'BODYWEIGHT_REPS') {
    return mode === null;
  }

  if (mode === 'ADDED_WEIGHT') return candidate.supportsAddedWeight;
  if (mode === 'ASSISTED') return candidate.supportsAssisted;
  return mode === 'BODYWEIGHT';
}

export function findTrainingProgramSubstitution(
  input: TrainingProgramSubstitutionInput,
): TrainingProgramSubstitutionResult | null {
  const originalCandidate = input.candidates.find(
    (candidate) => candidate.exerciseId === input.original.exerciseId,
  );

  const expectedCompound = input.original.selectionIntent === 'COMPOUND';
  const available = availableTrainingProgramEquipment(
    input.profile.accessMode,
    input.profile.equipmentKeys,
  );
  const excluded = trainingProgramExcludedExerciseIds(input.constraints);
  const preferred = trainingProgramPreferredExerciseIds(input.constraints);
  const occupied = new Set(input.occupiedExerciseIds);
  const temporaryExcluded = new Set(
    input.temporaryExcludedExerciseIds ?? [],
  );
  const historyByExercise = new Map(
    input.history.map((entry) => [entry.exerciseId, entry]),
  );

  excluded.add(input.original.exerciseId);
  temporaryExcluded.add(input.original.exerciseId);

  const ranked = input.candidates
    .filter((candidate) => {
      if (candidate.exerciseId === input.original.exerciseId) return false;
      if (occupied.has(candidate.exerciseId)) return false;
      if (excluded.has(candidate.exerciseId)) return false;
      if (temporaryExcluded.has(candidate.exerciseId)) return false;
      if (!candidate.volumeEligible) return false;

      if (candidate.measurementType !== input.original.measurementType) {
        return false;
      }

      if (!supportsBodyweightMode(candidate, input.original.bodyweightMode)) {
        return false;
      }

      if (
        isTrainingProgramCompoundCandidate(candidate)
        !== expectedCompound
      ) {
        return false;
      }

      const contribution = candidate.contributions.find(
        (item) =>
          item.muscleGroup === input.original.targetMuscleGroup,
      );
      if (!contribution) return false;

      if (
        contribution.role
        !== input.original.targetContributionRole
      ) {
        return false;
      }

      const requirements = resolveTrainingProgramExerciseRequirements(
        candidate,
      );
      return trainingProgramRequirementsAreAvailable(
        requirements,
        available,
      );
    })
    .map((candidate) => {
      const contribution = candidate.contributions.find(
        (item) =>
          item.muscleGroup === input.original.targetMuscleGroup,
      )!;

      return {
        candidate,
        score:
          Math.round(contribution.weight * 20)
          + (
            trainingProgramPrimaryGroupMatchesTarget(
              candidate.primaryMuscleGroup,
              input.original.targetMuscleGroup,
            )
              ? 15
              : 0
          )
          + (
            originalCandidate
            && candidate.workoutType === originalCandidate.workoutType
              ? 12
              : 0
          )
          + (preferred.has(candidate.exerciseId) ? 35 : 0)
          + historyScore(historyByExercise.get(candidate.exerciseId)),
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;

      const name = left.candidate.canonicalName.localeCompare(
        right.candidate.canonicalName,
        'en-CA',
      );
      return name !== 0
        ? name
        : left.candidate.exerciseId.localeCompare(
          right.candidate.exerciseId,
        );
    });

  const winner = ranked[0]?.candidate;
  if (!winner) return null;

  const replacement: TrainingProgramExercisePrescription = {
    ...input.original,
    exerciseId: winner.exerciseId,
    canonicalName: winner.canonicalName,
    targetWeightKg: winner.measurementType === 'WEIGHT_REPS'
      ? resolveTrainingProgramReferenceWeight(
          winner,
          historyByExercise.get(winner.exerciseId),
          input.original.repsMin,
          input.original.repsMax,
        )
      : null,
    bodyweightMode: winner.measurementType === 'BODYWEIGHT_REPS'
      ? input.original.bodyweightMode
      : null,
  };

  return {
    replacement,
    substitutedForExerciseId: input.original.exerciseId,
    constraintRevision: input.constraints.revision,
  };
}
