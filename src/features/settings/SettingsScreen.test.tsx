import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PwaService, PwaSnapshot } from '../../pwa/pwaService';
import type { PlatformAccessService } from '../admin/platformAccessService';
import type { GroupService } from '../groups/groupService';
import type { ProfilePictureService } from '../profile-picture/profilePictureService';
import type { AccountDeletionService } from './accountDeletionService';
import type { SettingsService } from './settingsService';
import { SettingsScreen } from './SettingsScreen';

const profile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-01-01T00:00:00.000Z', profileCode: 'ABC123',
  preferredWeightUnit: 'KG' as const,
};

function access(isPlatformAdmin: boolean): PlatformAccessService {
  return { load: async () => ({ accountStatus: 'ACTIVE', isPlatformAdmin }) };
}

const groupService = {
  listGroups: vi.fn(async () => [{
    id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'MEMBER' as const,
    joinedAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
  }]),
  listPendingInvites: vi.fn(async () => []),
} as unknown as GroupService;

const profilePictureService = {
  get: vi.fn(async () => ({ path: null, url: null })),
  getPublicUrl: vi.fn(() => null),
} as unknown as ProfilePictureService;

const pwaSnapshot: PwaSnapshot = {
  online: true, standalone: false, platform: 'other', installAvailable: false, manualInstallAvailable: false,
  updateAvailable: false, applyingUpdate: false, serviceWorkerError: false,
  storagePersistence: 'persistent', storagePersistenceRequestAvailable: false,
};
const pwaService = {
  getSnapshot: () => pwaSnapshot,
  subscribe: () => () => undefined,
  start: () => () => undefined,
  requestInstall: vi.fn(async () => 'unavailable' as const),
  requestPersistentStorage: vi.fn(async () => 'persistent' as const),
  applyUpdate: vi.fn(() => false),
} satisfies PwaService;

const settingsService = { load: vi.fn(async () => profile), update: vi.fn(async () => profile) } satisfies SettingsService;
const deletionService = {
  request: vi.fn(async () => 'DELETE stefan'),
  cancel: vi.fn(async () => undefined),
  confirm: vi.fn(async () => undefined),
} satisfies AccountDeletionService;
const shared = { deletionService, groupService, profilePictureService, pwaService, settingsService };

describe('SettingsScreen foundation', () => {
  it('shows all real ordinary-account sections and account identity', async () => {
    render(<SettingsScreen {...shared} accessService={access(false)} memberSince="2026-01-01T00:00:00Z" profile={profile} userEmail="stefan@example.com" />);

    for (const heading of ['Profile picture', 'Profile', 'Training', 'Notifications', 'Security', 'Groups', 'Privacy & data', 'App status']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText('stefan@example.com')).toBeInTheDocument();
    expect(await screen.findByText('Iron Crew')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Export data/i)).not.toBeInTheDocument();
  });

  it('persists validated profile and training choices through the settings service', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ...profile, displayName: 'Stefan Saladino', preferredWeightUnit: 'LB' as const }));
    const settingsService = { load: vi.fn(), update } as SettingsService;
    render(<SettingsScreen {...shared} accessService={access(false)} profile={profile} settingsService={settingsService} />);

    await user.clear(screen.getByLabelText('Display name'));
    await user.type(screen.getByLabelText('Display name'), 'Stefan Saladino');
    await user.selectOptions(screen.getByLabelText('Preferred weight unit'), 'LB');
    await user.click(screen.getByRole('button', { name: 'Save profile & training' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Stefan Saladino', preferredWeightUnit: 'LB', weeklyTarget: 4,
    })));
    expect(await screen.findByText('Profile settings saved.')).toBeInTheDocument();
  });

  it('requires the exact server phrase and supports cancellation before irreversible deletion', async () => {
    const deletionService: AccountDeletionService = {
      request: vi.fn(async () => 'DELETE stefan'),
      cancel: vi.fn(async () => undefined),
      confirm: vi.fn(async () => undefined),
    };
    render(<SettingsScreen {...shared} accessService={access(false)} deletionService={deletionService} profile={profile} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start account deletion' }));
    expect(await screen.findByText('DELETE stefan')).toBeInTheDocument();
    const permanent = screen.getByRole('button', { name: 'Delete permanently' });
    expect(permanent).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Exact confirmation phrase'), { target: { value: 'DELETE wrong' } });
    expect(permanent).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel deletion request' }));
    await waitFor(() => expect(deletionService.cancel).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Start account deletion' })).toBeInTheDocument();
  });

  it('shows the Administration entry only after positive ACTIVE platform-admin authorization', async () => {
    render(<SettingsScreen {...shared} accessService={access(true)} profile={profile} />);
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platform administration' })).toBeInTheDocument();
  });

  it('leaves no admin heading or placeholder for ordinary users', async () => {
    render(<SettingsScreen {...shared} accessService={access(false)} profile={profile} />);
    await screen.findByText('Weekly lifting target');
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Platform administration is available/)).not.toBeInTheDocument();
  });

  it('keeps ordinary Settings usable and hides Administration when the access check fails', async () => {
    const failed: PlatformAccessService = { load: async () => { throw new Error('offline'); } };
    render(<SettingsScreen {...shared} accessService={failed} profile={profile} />);
    expect(screen.getByRole('heading', { name: 'Profile & settings' })).toBeInTheDocument();
    await screen.findByText('Weekly lifting target');
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument();
  });
});
