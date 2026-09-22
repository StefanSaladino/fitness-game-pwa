import { describe, expect, it } from 'vitest';
import {
  availableTrainingProgramEquipment,
  resolveTrainingProgramExerciseRequirements,
  trainingProgramRequirementsAreAvailable,
} from './trainingProgramExerciseRequirements';

describe('training program exercise equipment requirements', () => {
  it('requires rack and bench for barbell bench pressing', () => {
    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Barbell Bench Press',
      measurementType: 'WEIGHT_REPS',
      workoutType: 'BARBELL',
    })).toEqual({
      generatorEligible: true,
      requiredEquipmentKeys: ['BARBELL', 'RACK', 'BENCH'],
      reason: null,
    });
  });

  it('does not invent rack access for deadlifts', () => {
    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Deadlift',
      measurementType: 'WEIGHT_REPS',
      workoutType: 'BARBELL',
    }).requiredEquipmentKeys).toEqual(['BARBELL']);
  });

  it('maps pull-ups and ring work to explicit equipment', () => {
    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Pull-Up',
      measurementType: 'BODYWEIGHT_REPS',
      workoutType: 'BODYWEIGHT',
    }).requiredEquipmentKeys).toEqual(['PULL_UP_BAR']);

    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Ring Row',
      measurementType: 'BODYWEIGHT_REPS',
      workoutType: 'BODYWEIGHT',
    }).requiredEquipmentKeys).toEqual(['RINGS']);
  });

  it('fails closed for requirements the profile taxonomy cannot represent', () => {
    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Ab Wheel Rollout',
      measurementType: 'BODYWEIGHT_REPS',
      workoutType: 'BODYWEIGHT',
    })).toEqual(expect.objectContaining({
      generatorEligible: false,
      reason: 'UNREPRESENTED_EQUIPMENT',
    }));

    expect(resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Double-Under',
      measurementType: 'BODYWEIGHT_REPS',
      workoutType: 'PLYOMETRIC',
    })).toEqual(expect.objectContaining({
      generatorEligible: false,
      reason: 'UNREPRESENTED_EQUIPMENT',
    }));
  });

  it('requires a plyometric box for depth and box-based jumps', () => {
    for (const name of ['Box Jump', 'Depth Jump', 'Drop Jump', 'Burpee Box Jump']) {
      expect(resolveTrainingProgramExerciseRequirements({
        canonicalName: name,
        measurementType: 'BODYWEIGHT_REPS',
        workoutType: 'PLYOMETRIC',
      }).requiredEquipmentKeys).toEqual(['PLYOMETRIC_BOX']);
    }
  });

  it('keeps commercial gym assumptions narrower than specialty access', () => {
    const available = availableTrainingProgramEquipment('COMMERCIAL_GYM', []);
    const trapBar = resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Trap Bar Deadlift',
      measurementType: 'WEIGHT_REPS',
      workoutType: 'SPECIALTY',
    });
    expect(trainingProgramRequirementsAreAvailable(trapBar, available)).toBe(false);
  });

  it('supports truly equipment-free bodyweight work for an empty custom setup', () => {
    const available = availableTrainingProgramEquipment('CUSTOM', []);
    const pushUp = resolveTrainingProgramExerciseRequirements({
      canonicalName: 'Push-Up',
      measurementType: 'BODYWEIGHT_REPS',
      workoutType: 'BODYWEIGHT',
    });
    expect(trainingProgramRequirementsAreAvailable(pushUp, available)).toBe(true);
  });
});
