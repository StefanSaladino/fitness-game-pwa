import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseProgressSummary } from '../model';
import type { ExerciseProgressService } from '../progressService';
import { useExerciseProgress } from './useExerciseProgress';

const exercises: ExerciseProgressSummary[] = [
  {
    exerciseId: 'bench', canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS', metricType: 'E1RM', bestValue: 122.5,
    bestWeightKg: 105, bestReps: 5, achievedAt: '2026-08-12T14:30:00Z', previousPrValue: 116.7,
    sessionCount: 3, observationCount: 3, firstPerformedAt: '2026-08-10T14:30:00Z', lastPerformedAt: '2026-08-17T14:30:00Z',
    averageDaysBetweenSessions: 3.5, latestMetricValue: 116.7, latestWeightKg: 100, latestReps: 5, latestObservedAt: '2026-08-17T14:30:00Z',
  },
  {
    exerciseId: 'pullup', canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS', metricType: 'BODYWEIGHT_REPS', bestValue: 12,
    bestWeightKg: null, bestReps: 12, achievedAt: '2026-08-18T14:30:00Z', previousPrValue: 10,
    sessionCount: 3, observationCount: 2, firstPerformedAt: '2026-08-11T14:30:00Z', lastPerformedAt: '2026-08-18T14:30:00Z',
    averageDaysBetweenSessions: 3.5, latestMetricValue: 12, latestWeightKg: null, latestReps: 12, latestObservedAt: '2026-08-18T14:30:00Z',
  },
];

describe('useExerciseProgress', () => {
  it('loads the overview, selects the first lift, and reloads history on selection', async () => {
    const listOverview = vi.fn(async () => exercises);
    const loadHistory = vi.fn(async (exerciseId: string) => [{
      workoutId: `${exerciseId}-workout`, scoringDate: '2026-08-18', observedAt: '2026-08-18T14:30:00Z', metricType: exerciseId === 'bench' ? 'E1RM' as const : 'BODYWEIGHT_REPS' as const,
      metricValue: exerciseId === 'bench' ? 122.5 : 12, weightKg: exerciseId === 'bench' ? 105 : null, reps: exerciseId === 'bench' ? 5 : 12,
      previousPrValue: null, isBaseline: true, isPr: false, isCurrentPr: true, completedWorkingSets: 4, sessionVolumeKgReps: exerciseId === 'bench' ? 2100 : 0,
      heaviestWeightKg: exerciseId === 'bench' ? 105 : null, maxCompletedReps: exerciseId === 'bench' ? 5 : 12, plainBodyweightSets: exerciseId === 'bench' ? 0 : 4,
      addedWeightSets: 0, assistedSets: 0,
    }]);
    const service: ExerciseProgressService = { listOverview, loadHistory };

    const { result } = renderHook(() => useExerciseProgress(service));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.historyStatus).toBe('ready'));
    expect(result.current.selectedExercise?.exerciseId).toBe('bench');
    expect(loadHistory).toHaveBeenCalledWith('bench');
    expect(result.current.analytics?.metricTrend[0]?.value).toBe(122.5);
    expect(result.current.analytics?.totalVolumeKgReps).toBe(2100);

    act(() => result.current.selectExercise('pullup'));
    await waitFor(() => expect(result.current.selectedExercise?.exerciseId).toBe('pullup'));
    await waitFor(() => expect(result.current.history[0]?.workoutId).toBe('pullup-workout'));
    expect(loadHistory).toHaveBeenCalledWith('pullup');
    expect(result.current.analytics?.metricType).toBe('BODYWEIGHT_REPS');
  });
});
