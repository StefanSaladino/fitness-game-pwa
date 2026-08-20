import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createOnboardingService } from './onboardingService';

function createClient(overrides?: {
  profileData?: Record<string, unknown> | null;
  profileError?: Error | null;
  rpcError?: Error | null;
}) {
  const single = vi.fn().mockResolvedValue({
    data: overrides?.profileData ?? {
      id: 'user-1',
      username: 'stefan',
      display_name: 'Stefan',
      timezone: 'America/Toronto',
      weekly_workout_target: 4,
      pending_weekly_workout_target: null,
      onboarding_completed_at: null,
      profile_code: 'FG-1A2B3C4D5E',
    },
    error: overrides?.profileError ?? null,
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn().mockResolvedValue({ data: null, error: overrides?.rpcError ?? null });

  const client = { from, rpc } as unknown as SupabaseClient;
  return { client, from, select, eq, single, rpc };
}

describe('onboarding service', () => {
  it('maps database profile columns into feature model fields', async () => {
    const fake = createClient();
    const service = createOnboardingService(fake.client);

    await expect(service.getProfile('user-1')).resolves.toEqual({
      id: 'user-1',
      username: 'stefan',
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyWorkoutTarget: 4,
      pendingWeeklyWorkoutTarget: null,
      onboardingCompletedAt: null,
      profileCode: 'FG-1A2B3C4D5E',
    });

    expect(fake.from).toHaveBeenCalledWith('profiles');
    expect(fake.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('normalizes and sends one authoritative onboarding RPC', async () => {
    const fake = createClient();
    const service = createOnboardingService(fake.client);

    await service.complete({
      username: '  Stefan_23 ',
      displayName: ' Stefan ',
      timezone: 'America/Toronto',
      weeklyTarget: 5,
    });

    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.rpc).toHaveBeenCalledWith('complete_onboarding', {
      p_username: 'stefan_23',
      p_display_name: 'Stefan',
      p_timezone: 'America/Toronto',
      p_weekly_target: 5,
    });
  });

  it('rejects invalid onboarding before making a network call', async () => {
    const fake = createClient();
    const service = createOnboardingService(fake.client);

    await expect(service.complete({
      username: 'x',
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyTarget: 3,
    })).rejects.toThrow('Onboarding input is invalid.');

    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it('validates future weekly targets before invoking the RPC', async () => {
    const fake = createClient();
    const service = createOnboardingService(fake.client);

    await expect(service.scheduleWeeklyTarget(8)).rejects.toThrow(RangeError);
    expect(fake.rpc).not.toHaveBeenCalled();

    await service.scheduleWeeklyTarget(6);
    expect(fake.rpc).toHaveBeenCalledWith('schedule_weekly_target', { p_target: 6 });
  });

  it('propagates Supabase errors instead of converting them into UI text', async () => {
    const fake = createClient({ rpcError: new Error('database rejected request') });
    const service = createOnboardingService(fake.client);

    await expect(service.scheduleWeeklyTarget(4)).rejects.toThrow('database rejected request');
  });
});
