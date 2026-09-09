import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseAnalyticsTrackingService } from '../analyticsTrackingService';
import { useExerciseAnalyticsTracking } from './useExerciseAnalyticsTracking';

describe('useExerciseAnalyticsTracking', () => {
  it('loads, tracks, untracks, and re-tracks without duplicating ids', async () => {
    const service: ExerciseAnalyticsTrackingService = {
      listTrackedExerciseIds: vi.fn(async () => ['bench']),
      setTracked: vi.fn(async (_exerciseId, tracked) => tracked),
    };

    const { result } = renderHook(() => useExerciseAnalyticsTracking(service));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.trackedExerciseIds).toEqual(['bench']);

    await act(async () => {
      expect(await result.current.setTracked('bench', true)).toBe(true);
    });
    expect(result.current.trackedExerciseIds).toEqual(['bench']);

    await act(async () => {
      expect(await result.current.setTracked('bench', false)).toBe(true);
    });
    expect(result.current.trackedExerciseIds).toEqual([]);

    await act(async () => {
      expect(await result.current.setTracked('bench', true)).toBe(true);
    });
    expect(result.current.trackedExerciseIds).toEqual(['bench']);
  });
});
