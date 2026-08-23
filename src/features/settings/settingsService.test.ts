import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createSettingsService } from './settingsService';

const row = {
  id: 'user-1', username: 'stefan', display_name: 'Stefan', timezone: 'America/Toronto',
  weekly_workout_target: 4, pending_weekly_workout_target: null,
  onboarding_completed_at: '2026-08-18T00:00:00.000Z', profile_code: 'FG-ABC', preferred_weight_unit: 'LB',
};

function clientFor(data: unknown, rpc = vi.fn()) {
  const single = vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return {
    client: { from: vi.fn(() => ({ select })), rpc } as unknown as SupabaseClient,
    select, eq, single, rpc,
  };
}

describe('settings service', () => {
  it('loads the typed self-profile preference read model', async () => {
    const fake = clientFor(row);
    const service = createSettingsService(fake.client);

    await expect(service.load('user-1')).resolves.toEqual(expect.objectContaining({
      username: 'stefan', preferredWeightUnit: 'LB', weeklyWorkoutTarget: 4,
    }));
    expect(fake.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(fake.select).toHaveBeenCalledWith(expect.stringContaining('preferred_weight_unit'));
  });

  it('normalizes editable identity and delegates one atomic update RPC', async () => {
    const rpc = vi.fn(async () => ({ data: row, error: null }));
    const service = createSettingsService(clientFor(null, rpc).client);

    await expect(service.update({
      username: '  STEFAN  ', displayName: '  Stefan  ', timezone: 'America/Toronto',
      weeklyTarget: 4, preferredWeightUnit: 'LB',
    })).resolves.toEqual(expect.objectContaining({ preferredWeightUnit: 'LB' }));

    expect(rpc).toHaveBeenCalledWith('update_my_profile_settings', {
      p_username: 'stefan', p_display_name: 'Stefan', p_timezone: 'America/Toronto',
      p_weekly_target: 4, p_preferred_weight_unit: 'LB',
    });
  });

  it('rejects invalid preferences before any remote write', async () => {
    const rpc = vi.fn();
    const service = createSettingsService(clientFor(null, rpc).client);

    await expect(service.update({
      username: 'bad-name', displayName: 'Stefan', timezone: 'America/Toronto',
      weeklyTarget: 4, preferredWeightUnit: 'KG',
    })).rejects.toThrow('Onboarding input is invalid.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts the one-row PostgREST composite representation', async () => {
    const rpc = vi.fn(async () => ({ data: [row], error: null }));
    const service = createSettingsService(clientFor(null, rpc).client);

    await expect(service.update({
      username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto',
      weeklyTarget: 4, preferredWeightUnit: 'LB',
    })).resolves.toEqual(expect.objectContaining({ username: 'stefan', preferredWeightUnit: 'LB' }));
  });

  it('fails closed on an unrecognized server weight unit', async () => {
    const service = createSettingsService(clientFor({ ...row, preferred_weight_unit: 'STONE' }).client);
    await expect(service.load('user-1')).rejects.toThrow('invalid preferred weight unit');
  });
});
