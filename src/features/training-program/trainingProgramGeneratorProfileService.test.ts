import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createTrainingProgramGeneratorProfileService } from './trainingProgramGeneratorProfileService';

const row = {
  user_id: 'user-1',
  access_mode: 'CUSTOM',
  equipment_keys: ['DUMBBELLS', 'BENCH'],
  goal: null,
  sessions_per_week: null,
  revision: 3,
  created_at: '2026-09-22T20:00:00.000Z',
  updated_at: '2026-09-22T20:05:00.000Z',
};

function clientFor(data: unknown, rpc = vi.fn()) {
  const maybeSingle = vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from, rpc } as unknown as SupabaseClient,
    from,
    eq,
    rpc,
  };
}

describe('training program generator profile service', () => {
  it('loads access plus nullable generation preferences from the shared profile row', async () => {
    const fake = clientFor(row);
    const service = createTrainingProgramGeneratorProfileService(fake.client);

    await expect(service.load('user-1')).resolves.toEqual({
      userId: 'user-1',
      accessMode: 'CUSTOM',
      equipmentKeys: ['DUMBBELLS', 'BENCH'],
      goal: null,
      sessionsPerWeek: null,
      revision: 3,
      createdAt: '2026-09-22T20:00:00.000Z',
      updatedAt: '2026-09-22T20:05:00.000Z',
    });

    expect(fake.from).toHaveBeenCalledWith('training_program_profiles');
    expect(fake.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('persists explicit goal and weekly frequency through one revision-guarded RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ...row,
        goal: 'BALANCED',
        sessions_per_week: 4,
        revision: 4,
      },
      error: null,
    }));

    const service = createTrainingProgramGeneratorProfileService(
      clientFor(null, rpc).client,
    );

    await expect(service.updatePreferences({
      goal: 'BALANCED',
      sessionsPerWeek: 4,
      expectedRevision: 3,
    })).resolves.toEqual(expect.objectContaining({
      goal: 'BALANCED',
      sessionsPerWeek: 4,
      revision: 4,
    }));

    expect(rpc).toHaveBeenCalledWith(
      'update_my_training_program_generation_preferences',
      {
        p_goal: 'BALANCED',
        p_sessions_per_week: 4,
        p_expected_revision: 3,
      },
    );
  });

  it('fails closed on incomplete persisted generation preferences', async () => {
    const service = createTrainingProgramGeneratorProfileService(
      clientFor({ ...row, goal: 'BALANCED', sessions_per_week: null }).client,
    );

    await expect(service.load('user-1')).rejects.toThrow(
      'incomplete generation preferences',
    );
  });
});
