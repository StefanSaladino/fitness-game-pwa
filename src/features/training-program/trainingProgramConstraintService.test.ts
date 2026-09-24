import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTrainingProgramConstraintService } from './trainingProgramConstraintService';

describe('training program constraint service', () => {
  it('maps an empty revision-zero snapshot', async () => {
    const rpc = vi.fn(async () => ({
      data: { revision: 0, entries: [] },
      error: null,
    }));

    const service = createTrainingProgramConstraintService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(service.load()).resolves.toEqual({
      revision: 0,
      entries: [],
    });
  });

  it('normalizes replace entries before calling the RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        revision: 2,
        entries: [{
          exerciseId: 'bench',
          kind: 'EXCLUDE',
          reason: 'OTHER',
        }],
      },
      error: null,
    }));

    const service = createTrainingProgramConstraintService({
      rpc,
    } as unknown as SupabaseClient);

    await service.replace({
      expectedRevision: 1,
      entries: [{
        exerciseId: ' bench ',
        kind: 'EXCLUDE',
        reason: 'OTHER',
      }],
    });

    expect(rpc).toHaveBeenCalledWith(
      'replace_my_training_program_exercise_constraints',
      {
        p_constraints: [{
          exerciseId: 'bench',
          kind: 'EXCLUDE',
          reason: 'OTHER',
        }],
        p_expected_revision: 1,
      },
    );
  });

  it('rejects invalid preference semantics before hitting Supabase', async () => {
    const rpc = vi.fn();
    const service = createTrainingProgramConstraintService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(service.replace({
      expectedRevision: 0,
      entries: [{
        exerciseId: 'bench',
        kind: 'PREFER',
        reason: 'PHYSICAL_LIMITATION',
      }],
    })).rejects.toThrow('PREFERENCE reason');

    expect(rpc).not.toHaveBeenCalled();
  });
});
