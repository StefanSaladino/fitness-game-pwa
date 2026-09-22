import {
  commercialGymAssumedEquipmentKeys,
  normalizeTrainingProgramEquipmentKeys,
  type TrainingProgramAccessMode,
  type TrainingProgramEquipmentKey,
} from './trainingProgramEquipment';
import type { TrainingProgramMeasurementType } from './trainingProgram';

export type TrainingProgramRequirementReason =
  | 'UNSUPPORTED_MEASUREMENT'
  | 'UNSUPPORTED_WORKOUT_TYPE'
  | 'UNREPRESENTED_EQUIPMENT';

export interface TrainingProgramExerciseRequirementInput {
  canonicalName: string;
  measurementType: string;
  workoutType: string;
}

export interface TrainingProgramExerciseRequirements {
  generatorEligible: boolean;
  requiredEquipmentKeys: TrainingProgramEquipmentKey[];
  reason: TrainingProgramRequirementReason | null;
}

function eligible(
  ...keys: TrainingProgramEquipmentKey[]
): TrainingProgramExerciseRequirements {
  return {
    generatorEligible: true,
    requiredEquipmentKeys: normalizeTrainingProgramEquipmentKeys(keys),
    reason: null,
  };
}

function excluded(
  reason: TrainingProgramRequirementReason,
): TrainingProgramExerciseRequirements {
  return {
    generatorEligible: false,
    requiredEquipmentKeys: [],
    reason,
  };
}

function has(name: string, ...parts: string[]): boolean {
  return parts.some((part) => name.includes(part));
}

function barbellRequirements(name: string): TrainingProgramExerciseRequirements {
  const keys: TrainingProgramEquipmentKey[] = ['BARBELL'];

  if (
    has(
      name,
      'bench press',
      'larsen press',
      'spoto press',
      'board press',
      'jm press',
      'pin bench press',
      'chest-supported barbell row',
      'seal row',
      'hip thrust',
      'bulgarian split squat',
      'step-up',
      'box squat',
    )
  ) {
    keys.push('BENCH');
  }

  if (
    has(
      name,
      'back squat',
      'front squat',
      'pause squat',
      'paused squat',
      'zercher squat',
      'good morning',
      'box squat',
      'rack pull',
      'bench press',
      'larsen press',
      'spoto press',
      'board press',
      'jm press',
      'pin bench press',
    )
  ) {
    keys.push('RACK');
  }

  return eligible(...keys);
}

function dumbbellRequirements(name: string): TrainingProgramExerciseRequirements {
  const keys: TrainingProgramEquipmentKey[] = ['DUMBBELLS'];

  if (
    has(
      name,
      'bench press',
      'incline',
      'decline',
      'chest-supported',
      'pullover',
      'bulgarian split squat',
      'step-up',
      'hip thrust',
      'spider curl',
      'preacher curl',
      'seated shoulder press',
    )
  ) {
    keys.push('BENCH');
  }

  return eligible(...keys);
}

function bodyweightRequirements(name: string): TrainingProgramExerciseRequirements {
  if (has(name, 'ab wheel rollout', 'nordic hamstring curl')) {
    return excluded('UNREPRESENTED_EQUIPMENT');
  }

  if (name.includes('ring ')) return eligible('RINGS');

  if (
    has(
      name,
      'pull-up',
      'chin-up',
      'hanging ',
      'toes-to-bar',
      'muscle-up',
      'inverted row',
    )
  ) {
    return eligible('PULL_UP_BAR');
  }

  if (name === 'dip') return eligible('DIP_STATION');

  if (
    has(
      name,
      'bench dip',
      'bulgarian split squat',
      'hip thrust',
      'decline push-up',
      'incline push-up',
      'dragon flag',
    )
  ) {
    return eligible('BENCH');
  }

  if (has(name, 'step-up', 'step-down')) return eligible('PLYOMETRIC_BOX');

  return eligible();
}

function plyometricRequirements(name: string): TrainingProgramExerciseRequirements {
  if (has(name, 'hurdle', 'double-under')) {
    return excluded('UNREPRESENTED_EQUIPMENT');
  }

  if (name.includes('pull-up')) return eligible('PULL_UP_BAR');

  if (name.includes('jumping bulgarian split squat')) return eligible('BENCH');

  if (
    has(
      name,
      'box jump',
      'burpee box jump',
      'depth jump',
      'drop jump',
      'depth push-up',
      'push-up to box',
    )
  ) {
    return eligible('PLYOMETRIC_BOX');
  }

  return eligible();
}

function specialtyRequirements(name: string): TrainingProgramExerciseRequirements {
  if (
    has(
      name,
      '45-degree',
      'back extension',
      'ghd ',
      'glute ham raise',
      'reverse hyperextension',
    )
  ) {
    return eligible('GHD_BACK_EXTENSION');
  }

  if (
    has(
      name,
      'trap bar',
      'safety bar',
      'cambered bar',
      'swiss bar',
    )
  ) {
    const keys: TrainingProgramEquipmentKey[] = ['SPECIALTY_BARS'];
    if (has(name, 'squat', 'bench press')) keys.push('RACK');
    if (name.includes('bench press')) keys.push('BENCH');
    return eligible(...keys);
  }

  if (
    has(
      name,
      'hip airplane',
      'prone t-raise',
      'prone w-raise',
      'prone y-raise',
      'serratus wall slide',
      'tibialis raise',
    )
  ) {
    return eligible();
  }

  return excluded('UNREPRESENTED_EQUIPMENT');
}

export function resolveTrainingProgramExerciseRequirements(
  input: TrainingProgramExerciseRequirementInput,
): TrainingProgramExerciseRequirements {
  if (
    input.measurementType !== 'WEIGHT_REPS'
    && input.measurementType !== 'BODYWEIGHT_REPS'
  ) {
    return excluded('UNSUPPORTED_MEASUREMENT');
  }

  const name = input.canonicalName.trim().toLocaleLowerCase('en-CA');

  switch (input.workoutType) {
    case 'BARBELL':
      return barbellRequirements(name);
    case 'DUMBBELL':
      return dumbbellRequirements(name);
    case 'CABLE':
      return eligible('CABLE_STATION');
    case 'MACHINE':
      return eligible('MACHINES');
    case 'KETTLEBELL':
      return eligible('KETTLEBELLS');
    case 'LANDMINE':
      return eligible('BARBELL', 'LANDMINE');
    case 'OLYMPIC_POWER':
      return eligible('BARBELL');
    case 'BODYWEIGHT':
      return bodyweightRequirements(name);
    case 'PLYOMETRIC':
      return plyometricRequirements(name);
    case 'SPECIALTY':
      return specialtyRequirements(name);
    case 'STRONGMAN_CARRY_SLED':
      return eligible('STRONGMAN');
    case 'BAND':
    case 'MEDICINE_BALL':
    case 'ISOMETRIC':
    case 'OTHER':
      return excluded('UNSUPPORTED_WORKOUT_TYPE');
    default:
      return excluded('UNSUPPORTED_WORKOUT_TYPE');
  }
}

export function availableTrainingProgramEquipment(
  accessMode: TrainingProgramAccessMode,
  explicitEquipmentKeys: readonly TrainingProgramEquipmentKey[],
): Set<TrainingProgramEquipmentKey> {
  return new Set(
    accessMode === 'COMMERCIAL_GYM'
      ? commercialGymAssumedEquipmentKeys
      : explicitEquipmentKeys,
  );
}

export function trainingProgramRequirementsAreAvailable(
  requirements: TrainingProgramExerciseRequirements,
  available: ReadonlySet<TrainingProgramEquipmentKey>,
): boolean {
  return requirements.generatorEligible
    && requirements.requiredEquipmentKeys.every((key) => available.has(key));
}

export function isTrainingProgramMeasurementType(
  value: string,
): value is TrainingProgramMeasurementType {
  return value === 'WEIGHT_REPS' || value === 'BODYWEIGHT_REPS';
}
