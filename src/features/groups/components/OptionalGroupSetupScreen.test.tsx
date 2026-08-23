import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { PendingGroupInvite } from '../model';
import { OptionalGroupSetupScreen } from './OptionalGroupSetupScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-23T18:00:00Z', preferredWeightUnit: 'KG',
};
const invite: PendingGroupInvite = {
  id: 'invite-1', groupId: 'group-1', groupName: 'Night Crew', invitedByUserId: 'user-2',
  invitedByUsername: 'alex', invitedByDisplayName: 'Alex', createdAt: '2026-08-23T19:00:00Z',
};

function props(activeItem: 'groups' | 'compete' = 'groups') {
  return {
    activeItem,
    profile,
    creating: false,
    createError: '',
    inviteError: '',
    busyAction: null,
    pendingInvites: [invite],
    onCreate: vi.fn(async () => undefined),
    onAcceptInvite: vi.fn(async () => undefined),
    onDeclineInvite: vi.fn(async () => undefined),
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
  };
}

describe('OptionalGroupSetupScreen', () => {
  it('makes group membership explicitly voluntary and keeps a solo exit', async () => {
    const p = props('groups');
    render(<OptionalGroupSetupScreen {...p} />);

    expect(screen.getByRole('heading', { name: 'Train solo or add a group when you want.' })).toBeInTheDocument();
    expect(screen.getByText(/A group is optional/i)).toBeInTheDocument();
    expect(screen.getByText(/Future invitations can add additional groups too/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing else is required/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(p.onNavigate).toHaveBeenCalledWith('home');
  });

  it('explains that competition requires group context without blocking personal training', () => {
    render(<OptionalGroupSetupScreen {...props('compete')} />);
    expect(screen.getByRole('heading', { name: 'Competition starts when you join a group.' })).toBeInTheDocument();
    expect(screen.getByText(/workouts, XP, progress, and badges continue normally without a group/i)).toBeInTheDocument();
  });
});
