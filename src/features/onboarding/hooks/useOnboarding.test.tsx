import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../model';
import type { OnboardingService } from '../onboardingService';
import { useOnboarding } from './useOnboarding';

function makeProfile(complete = false): OnboardingProfile {
  return {
    id: 'user-1',
    username: complete ? 'stefan' : 'u_123456789012345678901234567890',
    displayName: 'Stefan',
    timezone: 'America/Toronto',
    weeklyWorkoutTarget: 3,
    pendingWeeklyWorkoutTarget: null,
    onboardingCompletedAt: complete ? '2026-08-19T20:00:00Z' : null,
  };
}

describe('useOnboarding', () => {
  it('loads persisted profile state and refreshes after atomic completion', async () => {
    const service: OnboardingService = {
      getProfile: vi.fn()
        .mockResolvedValueOnce(makeProfile(false))
        .mockResolvedValueOnce(makeProfile(true)),
      complete: vi.fn(async () => undefined),
      scheduleWeeklyTarget: vi.fn(async () => undefined),
    };

    const { result } = renderHook(() => useOnboarding('user-1', service));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile?.onboardingCompletedAt).toBeNull();

    await act(async () => {
      const ok = await result.current.complete({
        username: 'stefan',
        displayName: 'Stefan',
        timezone: 'America/Toronto',
        weeklyTarget: 4,
      });
      expect(ok).toBe(true);
    });

    expect(service.complete).toHaveBeenCalledOnce();
    expect(result.current.profile?.onboardingCompletedAt).toBeTruthy();
  });

  it('surfaces duplicate usernames without replacing the loaded profile', async () => {
    const duplicate = Object.assign(new Error('Username already taken'), { code: '23505' });
    const service: OnboardingService = {
      getProfile: vi.fn(async () => makeProfile(false)),
      complete: vi.fn(async () => { throw duplicate; }),
      scheduleWeeklyTarget: vi.fn(async () => undefined),
    };

    const { result } = renderHook(() => useOnboarding('user-1', service));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      const ok = await result.current.complete({
        username: 'taken',
        displayName: 'Stefan',
        timezone: 'America/Toronto',
        weeklyTarget: 3,
      });
      expect(ok).toBe(false);
    });

    expect(result.current.error).toMatch(/already taken/i);
    expect(result.current.profile?.onboardingCompletedAt).toBeNull();
  });
});
