import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateMonthlyTrainingReportPdf } from './trainingReportPdf';
import {
  buildTrainingReportQaFixture,
  TRAINING_REPORT_QA_SCENARIOS,
} from './trainingReportQaFixtures';

describe('training report QA fixtures', () => {
  it('covers all important report decision states in the mixed scenario', () => {
    const report = buildTrainingReportQaFixture(
      'mixed',
      'MONTH',
      '2026-08-01',
    );

    const actions = new Set(
      report.muscles.map((muscle) => muscle.correctivePlan.action),
    );

    expect(actions).toEqual(new Set([
      'ADD_VOLUME_CAUTIOUSLY',
      'REDUCE_VOLUME_CAUTIOUSLY',
      'HOLD_AND_REVIEW',
      'MAINTAIN',
      'MONITOR',
      'NO_ACTION',
    ]));
    expect(report.muscles).toHaveLength(12);
    expect(
      report.muscles.some(
        (muscle) => muscle.snapshot.muscleGroup === 'FOREARMS_GRIP',
      ),
    ).toBe(true);
    expect(
      report.muscles.some(
        (muscle) => muscle.snapshot.muscleGroup === 'NECK',
      ),
    ).toBe(false);
  });

  it.each(TRAINING_REPORT_QA_SCENARIOS)(
    'generates a valid monthly PDF for the %s scenario',
    async (scenario) => {
      const report = buildTrainingReportQaFixture(
        scenario,
        'MONTH',
        '2026-08-01',
      );
      const bytes = await generateMonthlyTrainingReportPdf(
        report,
        `QA ${scenario}`,
      );
      const pdf = await PDFDocument.load(bytes);

      expect(bytes.byteLength).toBeGreaterThan(1_000);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    },
  );

  it('forces a multi-page PDF under the stress fixture', async () => {
    const report = buildTrainingReportQaFixture(
      'stress',
      'MONTH',
      '2026-08-01',
    );
    const bytes = await generateMonthlyTrainingReportPdf(report, 'QA Stress');
    const pdf = await PDFDocument.load(bytes);

    expect(report.actionCounts.add).toBeGreaterThan(0);
    expect(report.actionCounts.reduce).toBeGreaterThan(0);
    expect(report.actionCounts.holdReview).toBeGreaterThan(0);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it('keeps the fake service period-correct for weekly reports too', () => {
    const report = buildTrainingReportQaFixture(
      'mixed',
      'WEEK',
      '2026-09-07',
    );

    expect(report.period.periodStart).toBe('2026-09-07');
    expect(report.period.periodEnd).toBe('2026-09-13');
    expect(
      report.muscles.every(
        (muscle) => muscle.snapshot.benchmarkWindowDays === 7,
      ),
    ).toBe(true);
  });
});
