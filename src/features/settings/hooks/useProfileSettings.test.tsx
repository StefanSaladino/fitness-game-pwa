import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { SettingsService } from '../settingsService';
import { useProfileSettings } from './useProfileSettings';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', preferredWeightUnit: 'KG',
};

describe('useProfileSettings', () => {
  it('stores the authoritative response and refreshes the parent profile boundary', async () => {
    const updated = { ...profile, displayName: 'Stefan S', pendingWeeklyWorkoutTarget: 5 as number | null };
    const service = { load: vi.fn(), update: vi.fn(async () => updated) } as SettingsService;
    const onChanged = vi.fn(async () => undefined);
    const { result } = renderHook(() => useProfileSettings(profile, service, onChanged));

    await act(async () => {
      await result.current.save({
        username: 'stefan', displayName: 'Stefan S', timezone: 'America/Toronto', weeklyTarget: 5,
        preferredWeightUnit: 'KG',
      });
    });

    expect(result.current.profile.displayName).toBe('Stefan S');
    expect(result.current.notice).toMatch(/5-day target starts next week/);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('maps failures and never reports success', async () => {
    const service = { load: vi.fn(), update: vi.fn(async () => { throw { code: '23505' }; }) } as SettingsService;
    const { result } = renderHook(() => useProfileSettings(profile, service));

    await act(async () => {
      await result.current.save({
        username: 'taken', displayName: 'Stefan', timezone: 'America/Toronto', weeklyTarget: 4,
        preferredWeightUnit: 'KG',
      });
    });

    expect(result.current.error).toMatch(/already taken/);
    expect(result.current.notice).toBe('');
  });
});
