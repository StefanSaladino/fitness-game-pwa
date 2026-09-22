import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createTrainingProgramProfileService } from './trainingProgramProfileService';

const row = {
  user_id: 'user-1',
  access_mode: 'CUSTOM',
  equipment_keys: ['DUMBBELLS', 'BENCH'],
  revision: 3,
  created_at: '2026-09-22T19:00:00.000Z',
  updated_at: '2026-09-22T19:05:00.000Z',
};

function clientFor(data: unknown, rpc = vi.fn()) {
  const maybeSingle = vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from, rpc } as unknown as SupabaseClient,
    from,
    select,
    eq,
    maybeSingle,
    rpc,
  };
}

describe('training program profile service', () => {
  it('loads the current user access profile through the RLS read boundary', async () => {
    const fake = clientFor(row);
    const service = createTrainingProgramProfileService(fake.client);

    await expect(service.load('user-1')).resolves.toEqual({
      userId: 'user-1',
      accessMode: 'CUSTOM',
      equipmentKeys: ['DUMBBELLS', 'BENCH'],
      revision: 3,
      createdAt: '2026-09-22T19:00:00.000Z',
      updatedAt: '2026-09-22T19:05:00.000Z',
    });
    expect(fake.from).toHaveBeenCalledWith('training_program_profiles');
    expect(fake.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns null before the user has explicitly chosen an access profile', async () => {
    const service = createTrainingProgramProfileService(clientFor(null).client);
    await expect(service.load('user-1')).resolves.toBeNull();
  });

  it('normalizes equipment and sends the expected revision to one guarded RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: { ...row, equipment_keys: ['DUMBBELLS', 'BENCH'], revision: 1 },
      error: null,
    }));
    const service = createTrainingProgramProfileService(clientFor(null, rpc).client);

    await service.update({
      accessMode: 'CUSTOM',
      equipmentKeys: [' bench ', 'DUMBBELLS', 'BENCH'],
      expectedRevision: 0,
    });

    expect(rpc).toHaveBeenCalledWith('update_my_training_program_access_profile', {
      p_access_mode: 'CUSTOM',
      p_equipment_keys: ['DUMBBELLS', 'BENCH'],
      p_expected_revision: 0,
    });
  });

  it('rejects commercial-gym rows carrying custom equipment before a remote write', async () => {
    const rpc = vi.fn();
    const service = createTrainingProgramProfileService(clientFor(null, rpc).client);

    await expect(service.update({
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: ['DUMBBELLS'],
      expectedRevision: 0,
    })).rejects.toThrow('must not store custom equipment selections');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed on malformed persisted equipment', async () => {
    const service = createTrainingProgramProfileService(
      clientFor({ ...row, equipment_keys: ['DUMBBELLS', 'ALIEN_MACHINE'] }).client,
    );
    await expect(service.load('user-1')).rejects.toThrow('Unsupported training-program equipment key');
  });
});
