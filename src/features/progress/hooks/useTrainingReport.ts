import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toUserFacingProgressError } from '../progressMessages';
import {
  createTrainingReportService,
  latestCompletedTrainingReportPeriodStart,
  shiftTrainingReportPeriodStart,
  type TrainingReportService,
} from '../trainingReportService';
import type {
  CompletedTrainingReport,
  TrainingReportPeriodKind,
} from '../trainingReportModel';
import type { ExerciseProgressStatus } from './useExerciseProgress';

export function useTrainingReport(
  timezone: string,
  injectedService?: TrainingReportService,
) {
  const serviceRef = useRef<TrainingReportService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = injectedService ?? createTrainingReportService();
  }

  const [periodKind, setPeriodKindState] =
    useState<TrainingReportPeriodKind>('WEEK');
  const latestStart = useMemo(
    () => latestCompletedTrainingReportPeriodStart(periodKind, timezone),
    [periodKind, timezone],
  );
  const [periodStart, setPeriodStart] = useState(latestStart);
  const [report, setReport] = useState<CompletedTrainingReport | null>(null);
  const [status, setStatus] = useState<ExerciseProgressStatus>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async (
    kind: TrainingReportPeriodKind,
    start: string,
  ) => {
    setStatus('loading');
    setError('');

    try {
      const next = await serviceRef.current!.loadReport(kind, start);
      setReport(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      setReport(null);
      setError(toUserFacingProgressError(caught));
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    setPeriodStart(
      latestCompletedTrainingReportPeriodStart(periodKind, timezone),
    );
    // A timezone change can move the user's local calendar boundary.
    // Period-kind changes are handled atomically by setPeriodKind below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  useEffect(() => {
    void load(periodKind, periodStart);
  }, [load, periodKind, periodStart]);

  const setPeriodKind = useCallback((kind: TrainingReportPeriodKind) => {
    setPeriodKindState(kind);
    setPeriodStart(
      latestCompletedTrainingReportPeriodStart(kind, timezone),
    );
  }, [timezone]);

  const goPrevious = useCallback(() => {
    setPeriodStart((current) =>
      shiftTrainingReportPeriodStart(periodKind, current, -1));
  }, [periodKind]);

  const canGoNext = periodStart < latestStart;

  const goNext = useCallback(() => {
    setPeriodStart((current) => {
      const next = shiftTrainingReportPeriodStart(periodKind, current, 1);
      return next <= latestStart ? next : current;
    });
  }, [latestStart, periodKind]);

  return {
    periodKind,
    periodStart,
    latestStart,
    canGoNext,
    report,
    status,
    error,
    setPeriodKind,
    goPrevious,
    goNext,
    retry: () => load(periodKind, periodStart),
  };
}
