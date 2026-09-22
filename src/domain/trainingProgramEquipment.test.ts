import { describe, expect, it } from 'vitest';
import {
  commercialGymAssumedEquipmentKeys,
  normalizeTrainingProgramEquipmentKeys,
  trainingProgramEquipmentOption,
  trainingProgramEquipmentOptions,
  validateTrainingProgramAccessSelection,
} from './trainingProgramEquipment';

describe('training program equipment contract', () => {
  it('normalizes, deduplicates, and returns equipment in canonical UI order', () => {
    expect(normalizeTrainingProgramEquipmentKeys([
      ' bands ',
      'DUMBBELLS',
      'bands',
      'BENCH',
    ])).toEqual(['DUMBBELLS', 'BENCH', 'BANDS']);
  });

  it('fails closed on unknown equipment keys', () => {
    expect(() => normalizeTrainingProgramEquipmentKeys(['SMITH_MACHINE_FROM_NOWHERE']))
      .toThrow('Unsupported training-program equipment key');
  });

  it('keeps commercial-gym access separate from custom selections', () => {
    expect(validateTrainingProgramAccessSelection('COMMERCIAL_GYM', [])).toEqual([]);
    expect(() => validateTrainingProgramAccessSelection('COMMERCIAL_GYM', ['DUMBBELLS']))
      .toThrow('must not store custom equipment selections');
  });

  it('allows an empty custom setup so bodyweight-only training is representable', () => {
    expect(validateTrainingProgramAccessSelection('CUSTOM', [])).toEqual([]);
  });

  it('marks bands as profile-only until their logging model is supported', () => {
    expect(trainingProgramEquipmentOption('BANDS')).toEqual(expect.objectContaining({
      support: 'PROFILE_ONLY',
    }));
  });

  it('does not pretend specialty and strongman equipment are standard commercial-gym assumptions', () => {
    expect(commercialGymAssumedEquipmentKeys).not.toContain('SPECIALTY_BARS');
    expect(commercialGymAssumedEquipmentKeys).not.toContain('STRONGMAN');
    expect(trainingProgramEquipmentOptions.map((option) => option.key)).toContain('SPECIALTY_BARS');
    expect(trainingProgramEquipmentOptions.map((option) => option.key)).toContain('STRONGMAN');
  });
});
