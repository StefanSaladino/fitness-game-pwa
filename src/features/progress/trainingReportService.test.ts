import { describe, expect, it } from 'vitest';
import {
  latestCompletedTrainingReportPeriodStart,
  shiftTrainingReportPeriodStart,
  trainingReportPeriodEnd,
} from './trainingReportService';

describe('training report period helpers', () => {
  it('resolves the latest fully completed Monday-Sunday week in the profile timezone', () => {
    expect(
      latestCompletedTrainingReportPeriodStart(
        'WEEK',
        'America/Toronto',
        new Date('2026-09-20T21:00:00Z'),
      ),
    ).toBe('2026-09-07');
  });

  it('resolves the latest fully completed calendar month in the profile timezone', () => {
    expect(
      latestCompletedTrainingReportPeriodStart(
        'MONTH',
        'America/Toronto',
        new Date('2026-09-20T21:00:00Z'),
      ),
    ).toBe('2026-08-01');
  });

  it('moves through weekly and monthly report periods without local-time drift', () => {
    expect(shiftTrainingReportPeriodStart('WEEK', '2026-09-07', -1))
      .toBe('2026-08-31');
    expect(shiftTrainingReportPeriodStart('WEEK', '2026-09-07', 1))
      .toBe('2026-09-14');
    expect(shiftTrainingReportPeriodStart('MONTH', '2026-08-01', -1))
      .toBe('2026-07-01');
    expect(shiftTrainingReportPeriodStart('MONTH', '2026-08-01', 1))
      .toBe('2026-09-01');
  });

  it('derives exact period ends', () => {
    expect(trainingReportPeriodEnd('WEEK', '2026-09-07'))
      .toBe('2026-09-13');
    expect(trainingReportPeriodEnd('MONTH', '2026-08-01'))
      .toBe('2026-08-31');
    expect(trainingReportPeriodEnd('MONTH', '2028-02-01'))
      .toBe('2028-02-29');
  });
});
