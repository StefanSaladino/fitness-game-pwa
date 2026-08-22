import { describe, expect, it } from 'vitest';
import type { ExerciseProgressHistoryEntry, ExerciseProgressSummary } from './model';
import { buildExerciseAnalytics } from './exerciseAnalytics';

const bench: ExerciseProgressSummary = {
  exerciseId: 'bench', canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS', metricType: 'E1RM', bestValue: 122.5,
  bestWeightKg: 105, bestReps: 5, achievedAt: '2026-08-18T14:30:00Z', previousPrValue: 116.7,
  sessionCount: 3, observationCount: 3, firstPerformedAt: '2026-08-10T14:30:00Z', lastPerformedAt: '2026-08-18T14:30:00Z',
  averageDaysBetweenSessions: 4, latestMetricValue: 122.5, latestWeightKg: 105, latestReps: 5, latestObservedAt: '2026-08-18T14:30:00Z',
};

function row(overrides: Partial<ExerciseProgressHistoryEntry>): ExerciseProgressHistoryEntry {
  return {
    workoutId: 'lift', scoringDate: '2026-08-10', observedAt: '2026-08-10T14:30:00Z', metricType: 'E1RM', metricValue: 110,
    weightKg: 95, reps: 5, previousPrValue: null, isBaseline: false, isPr: false, isCurrentPr: false,
    completedWorkingSets: 3, sessionVolumeKgReps: 1800, heaviestWeightKg: 100, maxCompletedReps: 8,
    plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
    ...overrides,
  };
}

describe('buildExerciseAnalytics', () => {
  it('sorts lift history chronologically and derives strength, volume, and PR analytics', () => {
    const analytics = buildExerciseAnalytics(bench, [
      row({ workoutId: 'latest', scoringDate: '2026-08-18', observedAt: '2026-08-18T14:30:00Z', metricValue: 122.5, weightKg: 105, reps: 5, previousPrValue: 116.7, isPr: true, isCurrentPr: true, sessionVolumeKgReps: 2300, heaviestWeightKg: 110, maxCompletedReps: 6 }),
      row({ workoutId: 'baseline', isBaseline: true, isCurrentPr: false, metricValue: 108, sessionVolumeKgReps: 1700, heaviestWeightKg: 95, maxCompletedReps: 10 }),
      row({ workoutId: 'middle', scoringDate: '2026-08-14', observedAt: '2026-08-14T14:30:00Z', metricValue: 116.7, previousPrValue: 108, isPr: true, sessionVolumeKgReps: 2100, heaviestWeightKg: 102.5, maxCompletedReps: 8 }),
    ]);

    expect(analytics?.metricTrend.map((point) => point.workoutId)).toEqual(['baseline', 'middle', 'latest']);
    expect(analytics?.volumeTrend.map((point) => point.value)).toEqual([1700, 2100, 2300]);
    expect(analytics?.bestWeightKg).toBe(110);
    expect(analytics?.bestReps).toBe(10);
    expect(analytics?.totalVolumeKgReps).toBe(6100);
    expect(analytics?.latestVolumeKgReps).toBe(2300);
    expect(analytics?.prTimeline.map((entry) => entry.kind)).toEqual(['baseline', 'pr', 'current-pr']);
  });

  it('keeps added-weight bodyweight work out of the comparable rep trend while retaining analytics volume', () => {
    const pullup: ExerciseProgressSummary = { ...bench, exerciseId: 'pullup', canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS', metricType: 'BODYWEIGHT_REPS' };
    const analytics = buildExerciseAnalytics(pullup, [
      row({ workoutId: 'plain', metricType: 'BODYWEIGHT_REPS', metricValue: 12, weightKg: null, reps: 12, heaviestWeightKg: null, maxCompletedReps: 12, plainBodyweightSets: 4, sessionVolumeKgReps: 0 }),
      row({ workoutId: 'added', scoringDate: '2026-08-18', observedAt: '2026-08-18T14:30:00Z', metricType: null, metricValue: null, weightKg: null, reps: null, heaviestWeightKg: 15, maxCompletedReps: 8, addedWeightSets: 4, sessionVolumeKgReps: 480 }),
    ]);

    expect(analytics?.metricTrend).toHaveLength(1);
    expect(analytics?.metricTrend[0]?.workoutId).toBe('plain');
    expect(analytics?.totalVolumeKgReps).toBe(480);
    expect(analytics?.bestWeightKg).toBe(15);
  });
});
