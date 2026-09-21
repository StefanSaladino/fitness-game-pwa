import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompletedTrainingReport } from '../trainingReportModel';
import type { TrainingReportService } from '../trainingReportService';
import { useTrainingReport } from './useTrainingReport';

const report = {
  reportVersion: 'training-report-v1',
  methodologyVersion: 'muscle-volume-v1',
  period: {
    periodKind: 'WEEK',
    periodStart: '2026-09-07',
    periodEnd: '2026-09-13',
    completedLiftingSessions: 4,
    activeTrainingSeconds: 14400,
    exerciseCount: 10,
    completedWorkingSets: 48,
    volumeKgReps: 42000,
    prCount: 2,
  },
  previousPeriod: null,
  delta: {
    completedLiftingSessions: null,
    activeTrainingSeconds: null,
    exerciseCount: null,
    completedWorkingSets: null,
    volumeKgReps: null,
    prCount: null,
  },
  muscles: [],
  statusCounts: {
    onTarget: 0,
    belowTarget: 0,
    aboveTarget: 0,
    noData: 0,
  },
  actionCounts: {
    add: 0,
    reduce: 0,
    maintain: 0,
    holdReview: 0,
    monitor: 0,
    noAction: 0,
  },
} satisfies CompletedTrainingReport;

describe('useTrainingReport', () => {
  it('loads the selected completed period and navigates older periods', async () => {
    const loadReport = vi.fn(async () => report);
    const service: TrainingReportService = { loadReport };

    const { result } = renderHook(() =>
      useTrainingReport('America/Toronto', service),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loadReport).toHaveBeenCalled();

    const firstStart = result.current.periodStart;

    act(() => result.current.goPrevious());

    await waitFor(() =>
      expect(result.current.periodStart).not.toBe(firstStart),
    );
    expect(result.current.canGoNext).toBe(true);
  });

  it('switches report cadence and resets to that cadence latest completed period', async () => {
    const loadReport = vi.fn(async () => report);
    const service: TrainingReportService = { loadReport };

    const { result } = renderHook(() =>
      useTrainingReport('America/Toronto', service),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.setPeriodKind('MONTH'));

    await waitFor(() => expect(result.current.periodKind).toBe('MONTH'));
    expect(result.current.periodStart.endsWith('-01')).toBe(true);
  });
});
