import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MuscleVolumeSummary } from '../model';
import type { MusclePerformanceService } from '../musclePerformanceService';
import { useMuscleVolumeRecommendations } from './useMuscleVolumeRecommendations';

const volumeRows: MuscleVolumeSummary[] = [{
  muscleGroup: 'CHEST',
  windowDays: 7,
  windowStart: '2026-09-13',
  windowEnd: '2026-09-19',
  methodologyVersion: 'muscle-volume-v1',
  effectiveSets: 6,
  directEffectiveSets: 6,
  indirectEffectiveSets: 0,
  eligibleLogicalSets: 6,
  eligibleStages: 6,
  reviewFlaggedLogicalSets: 0,
  targetMin: 10,
  targetMidpoint: 14,
  targetMax: 18,
  highReviewAbove: 20,
  volumeStatus: 'BELOW_TARGET',
  benchmarkEvidenceConfidence: 'MODERATE',
  highConfidenceEffectiveSets: 6,
  mediumConfidenceEffectiveSets: 0,
  lowOrProvisionalEffectiveSets: 0,
  provisionalEffectiveSets: 0,
  highConfidenceProportion: 1,
  mediumConfidenceProportion: 0,
  lowOrProvisionalProportion: 0,
}];

function performanceService(): MusclePerformanceService {
  const loadObservations = vi.fn(async () => {
    const start = Date.parse('2026-08-01T12:00:00Z');
    return [1, 1.01, 1, 1.005, 1, 1.01, 1].map((value, index) => {
      const date = new Date(start + index * 5 * 86_400_000);
      return {
        muscleGroup: 'CHEST' as const,
        exerciseId: 'bench',
        canonicalName: 'Barbell Bench Press',
        contributionRole: 'DIRECT' as const,
        contributionWeight: 1,
        scoringDate: date.toISOString().slice(0, 10),
        observedAt: date.toISOString(),
        relativePerformanceIndex: value,
      };
    });
  });

  return { loadObservations };
}

describe('useMuscleVolumeRecommendations', () => {
  it('loads the 56-day performance context only when the volume route is enabled', async () => {
    const service = performanceService();

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useMuscleVolumeRecommendations(volumeRows, enabled, service),
      { initialProps: { enabled: false } },
    );

    expect(service.loadObservations).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.loadObservations).toHaveBeenCalledWith(undefined, 56);
    expect(result.current.recommendations[0]?.performance.trend).toBe('PLATEAU');
    expect(result.current.recommendations[0]?.recommendation.action)
      .toBe('ADD_VOLUME_CAUTIOUSLY');
  });

  it('isolates performance-context failures from the volume data itself', async () => {
    const service: MusclePerformanceService = {
      loadObservations: vi.fn(async () => {
        throw new Error('Performance context unavailable');
      }),
    };

    const { result } = renderHook(() =>
      useMuscleVolumeRecommendations(volumeRows, true, service),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.error).toBe('Performance context unavailable');

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.status).toBe('error');
  });
});
