import { describe, expect, it } from 'vitest';
import type { TrainingProgramGeneratorCandidate } from './trainingProgramGenerator';
import {
  defaultTrainingProgramLimitationMovements,
  suggestTrainingProgramExercisesToReview,
} from './trainingProgramLimitations';

function candidate(
  exerciseId: string,
  canonicalName: string,
): TrainingProgramGeneratorCandidate {
  return {
    exerciseId,
    canonicalName,
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'CHEST',
    workoutType: 'BARBELL',
    supportsAddedWeight: false,
    supportsAssisted: false,
    volumeEligible: true,
    contributions: [{ muscleGroup: 'CHEST', role: 'DIRECT', weight: 1 }],
  };
}

describe('training program limitation suggestions', () => {
  it('starts with conservative movement-review defaults for common areas', () => {
    expect(defaultTrainingProgramLimitationMovements('SHOULDER')).toEqual([
      'OVERHEAD_PRESS',
      'HORIZONTAL_PRESS',
      'DIPS',
    ]);
    expect(defaultTrainingProgramLimitationMovements('KNEE')).toContain(
      'DEEP_KNEE_FLEXION',
    );
  });

  it('suggests exercises from explicit movement patterns without diagnosing', () => {
    const candidates = [
      candidate('bench', 'Barbell Bench Press'),
      candidate('press', 'Dumbbell Shoulder Press'),
      candidate('curl', 'Dumbbell Curl'),
    ];

    expect(
      suggestTrainingProgramExercisesToReview(
        candidates,
        ['OVERHEAD_PRESS', 'HORIZONTAL_PRESS'],
      ).map((item) => item.exerciseId),
    ).toEqual(['bench', 'press']);
  });
});
