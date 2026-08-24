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
    inviteStatus: 'ready' as const,
    busyAction: null,
    pendingInvites: [] as PendingGroupInvite[],
    onCreate: vi.fn(async () => undefined),
    onAcceptInvite: vi.fn(async () => undefined),
    onDeclineInvite: vi.fn(async () => undefined),
    onRetryInvites: vi.fn(async () => undefined),
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
  };
}

describe('OptionalGroupSetupScreen', () => {
  it('keeps the zero-group choice grounded while using the photo banner hierarchy', async () => {
    const p = props('groups');
    render(<OptionalGroupSetupScreen {...p} />);

    expect(screen.getByRole('heading', { name: 'Groups are optional.' })).toBeInTheDocument();
    expect(screen.getByText(/train on your own or create a group when you want shared competition/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create your group' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Group name' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(p.onNavigate).toHaveBeenCalledWith('home');
  });

  it('keeps targeted invitation identity and additive membership copy grounded', async () => {
    const p = { ...props('groups'), pendingInvites: [invite] };
    render(<OptionalGroupSetupScreen {...p} />);

    expect(screen.getByRole('heading', { name: 'Pending invitations' })).toBeInTheDocument();
    expect(screen.getByText(/joining adds the group without replacing your other memberships/i)).toBeInTheDocument();
    expect(screen.getByText('Night Crew')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('@alex')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create your group' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(p.onAcceptInvite).toHaveBeenCalledWith('invite-1');

    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(p.onDeclineInvite).toHaveBeenCalledWith('invite-1');
  });

  it('keeps competition optional without blocking personal training', () => {
    render(<OptionalGroupSetupScreen {...props('compete')} />);
    expect(screen.getByRole('heading', { name: 'Competition starts with a group.' })).toBeInTheDocument();
    expect(screen.getByText(/personal training still works without one/i)).toBeInTheDocument();
  });

  it('exposes honest invitation loading and retry states', async () => {
    const loading = { ...props('groups'), inviteStatus: 'loading' as const };
    const { rerender } = render(<OptionalGroupSetupScreen {...loading} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking invitations');

    const failed = {
      ...props('groups'),
      inviteStatus: 'error' as const,
      inviteError: 'Invitations unavailable.',
    };
    rerender(<OptionalGroupSetupScreen {...failed} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invitations unavailable.');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(failed.onRetryInvites).toHaveBeenCalledTimes(1);
  });
});
