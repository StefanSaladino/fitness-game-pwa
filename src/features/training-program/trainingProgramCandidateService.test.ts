import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createTrainingProgramCandidateService } from './trainingProgramCandidateService';

describe('training program candidate service', () => {
  it('maps the guarded generator catalogue payload', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        exercise_id: 'exercise-1',
        canonical_name: 'Back Squat',
        measurement_type: 'WEIGHT_REPS',
        primary_muscle_group: 'QUADS',
        workout_type: 'BARBELL',
        supports_added_weight: false,
        supports_assisted: false,
        volume_eligible: true,
        contributions: [
          { muscleGroup: 'QUADS', role: 'DIRECT', weight: 1 },
          { muscleGroup: 'GLUTES', role: 'INDIRECT', weight: 0.5 },
        ],
      }],
      error: null,
    }));

    const service = createTrainingProgramCandidateService(
      { rpc } as unknown as SupabaseClient,
    );

    await expect(service.load()).resolves.toEqual([
      expect.objectContaining({
        exerciseId: 'exercise-1',
        canonicalName: 'Back Squat',
        primaryMuscleGroup: 'QUADS',
        volumeEligible: true,
      }),
    ]);

    expect(rpc).toHaveBeenCalledWith(
      'get_my_training_program_candidate_catalog',
    );
  });

  it('fails closed on malformed Phase 19 contribution metadata', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        exercise_id: 'exercise-1',
        canonical_name: 'Back Squat',
        measurement_type: 'WEIGHT_REPS',
        primary_muscle_group: 'QUADS',
        workout_type: 'BARBELL',
        supports_added_weight: false,
        supports_assisted: false,
        volume_eligible: true,
        contributions: [
          { muscleGroup: 'ALIEN', role: 'DIRECT', weight: 1 },
        ],
      }],
      error: null,
    }));

    const service = createTrainingProgramCandidateService(
      { rpc } as unknown as SupabaseClient,
    );

    await expect(service.load()).rejects.toThrow(
      'invalid contribution muscle group',
    );
  });
});
