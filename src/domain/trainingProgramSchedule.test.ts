import { describe, expect, it } from 'vitest';
import {
  buildTrainingProgramSchedule,
  compatibleTrainingProgramSplits,
  normalizeTrainingProgramDays,
  resolveTrainingProgramSplit,
} from './trainingProgramSchedule';

describe('training program schedule contract', () => {
  it('exposes only frequency-compatible explicit splits', () => {
    expect(compatibleTrainingProgramSplits(3)).toEqual([
      'FULL_BODY_ABC',
      'PUSH_PULL_LEGS',
      'UPPER_LOWER_FULL_BODY',
    ]);
    expect(compatibleTrainingProgramSplits(6)).toEqual([
      'PPL_X2',
      'UPPER_LOWER_X3',
    ]);
  });

  it('resolves AUTO to the existing generator strategy', () => {
    expect(resolveTrainingProgramSplit(1, 'AUTO')).toBe('FULL_BODY');
    expect(resolveTrainingProgramSplit(4, 'AUTO')).toBe('UPPER_LOWER_X2');
    expect(resolveTrainingProgramSplit(5, 'AUTO')).toBe('UPPER_LOWER_PPL');
    expect(resolveTrainingProgramSplit(6, 'AUTO')).toBe('PPL_X2');
  });

  it('rejects an explicit split that does not match weekly frequency', () => {
    expect(() => resolveTrainingProgramSplit(
      4,
      'PUSH_PULL_LEGS',
    )).toThrow('not compatible');
  });

  it('requires exactly one distinct weekday per requested weekly session', () => {
    expect(normalizeTrainingProgramDays(
      ['FRIDAY', 'MONDAY', 'WEDNESDAY'],
      3,
    )).toEqual(['MONDAY', 'WEDNESDAY', 'FRIDAY']);

    expect(() => normalizeTrainingProgramDays(
      ['MONDAY', 'MONDAY'],
      2,
    )).toThrow('duplicates');

    expect(() => normalizeTrainingProgramDays(
      ['MONDAY'],
      2,
    )).toThrow('exactly 2');
  });

  it('starts on the first selected training date on or after startDate', () => {
    const schedule = buildTrainingProgramSchedule({
      startDate: '2026-09-24',
      durationWeeks: 4,
      trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
      sessionsPerWeek: 3,
    });

    expect(schedule).toHaveLength(12);
    expect(schedule.slice(0, 3)).toEqual([
      { weekIndex: 0, sessionIndex: 0, scheduledDate: '2026-09-25' },
      { weekIndex: 0, sessionIndex: 1, scheduledDate: '2026-09-28' },
      { weekIndex: 0, sessionIndex: 2, scheduledDate: '2026-09-30' },
    ]);
  });

  it('keeps every program week at the exact requested frequency', () => {
    const schedule = buildTrainingProgramSchedule({
      startDate: '2026-09-24',
      durationWeeks: 8,
      trainingDays: [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ],
      sessionsPerWeek: 6,
    });

    expect(schedule).toHaveLength(48);

    for (let weekIndex = 0; weekIndex < 8; weekIndex += 1) {
      expect(
        schedule.filter((slot) => slot.weekIndex === weekIndex),
      ).toHaveLength(6);
    }
  });

  it('rejects invalid calendar dates instead of relying on timezone parsing', () => {
    expect(() => buildTrainingProgramSchedule({
      startDate: '2026-02-30',
      durationWeeks: 4,
      trainingDays: ['MONDAY'],
      sessionsPerWeek: 1,
    })).toThrow('valid YYYY-MM-DD');
  });
});
