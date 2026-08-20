import { describe, expect, it, vi } from 'vitest';
import { createExercisePickerService } from './exercisePickerService';

describe('exercisePickerService', () => {
  it('loads the authenticated picker catalogue through one guarded RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        id: 'exercise-1', canonical_name: 'Barbell Bench Press', measurement_type: 'WEIGHT_REPS',
        primary_muscle_group: 'CHEST', workout_type: 'BARBELL', aliases: ['Bench'], last_used_at: null,
      }],
      error: null,
    }));
    const service = createExercisePickerService({ rpc } as never);

    await expect(service.loadCatalog()).resolves.toEqual([
      expect.objectContaining({ id: 'exercise-1', canonicalName: 'Barbell Bench Press', primaryMuscleGroup: 'CHEST', workoutType: 'BARBELL' }),
    ]);
    expect(rpc).toHaveBeenCalledWith('get_exercise_picker_catalog');
  });
});
