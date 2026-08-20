import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExercisePickerService } from '../exercisePickerService';
import { useExercisePickerCatalog } from './useExercisePickerCatalog';

const item = {
  id: 'exercise-1', canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS' as const,
  primaryMuscleGroup: 'CHEST' as const, workoutType: 'BARBELL' as const, aliases: ['Bench'], lastUsedAt: null,
};

describe('useExercisePickerCatalog', () => {
  it('loads once the active workout enables the picker catalogue', async () => {
    const service: ExercisePickerService = { loadCatalog: vi.fn(async () => [item]) };
    const { result } = renderHook(() => useExercisePickerCatalog(true, service));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.catalog).toEqual([item]);
  });

  it('stays idle without an active workout', async () => {
    const service: ExercisePickerService = { loadCatalog: vi.fn(async () => [item]) };
    const { result } = renderHook(() => useExercisePickerCatalog(false, service));
    await act(async () => undefined);
    expect(result.current.status).toBe('idle');
    expect(service.loadCatalog).not.toHaveBeenCalled();
  });
});
