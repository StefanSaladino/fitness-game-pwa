import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlatformAccessService } from '../admin/platformAccessService';
import { SettingsScreen } from './SettingsScreen';

const profile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-01-01T00:00:00.000Z', profileCode: 'ABC123',
};

function access(isPlatformAdmin: boolean): PlatformAccessService {
  return { load: async () => ({ accountStatus: 'ACTIVE', isPlatformAdmin }) };
}

describe('SettingsScreen admin discovery', () => {
  it('shows the Administration entry only after positive ACTIVE platform-admin authorization', async () => {
    render(<SettingsScreen profile={profile} accessService={access(true)} />);
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platform administration' })).toBeInTheDocument();
  });

  it('leaves no admin heading or placeholder for ordinary users', async () => {
    render(<SettingsScreen profile={profile} accessService={access(false)} />);
    await screen.findByText('Weekly lifting target');
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Platform administration is available/)).not.toBeInTheDocument();
  });

  it('keeps ordinary Settings usable and hides Administration when the access check fails', async () => {
    const failed: PlatformAccessService = { load: async () => { throw new Error('offline'); } };
    render(<SettingsScreen profile={profile} accessService={failed} />);
    expect(screen.getByRole('heading', { name: 'Profile & settings' })).toBeInTheDocument();
    await screen.findByText('Weekly lifting target');
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument();
  });

});
