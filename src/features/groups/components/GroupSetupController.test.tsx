import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import type { GroupSummary } from '../model';
import { GroupSetupController } from './GroupSetupController';

const group: GroupSummary = {
  id: 'group-1',
  name: 'Iron Crew',
  memberCount: 1,
  role: 'OWNER',
  joinedAt: '2026-08-19T20:00:00Z',
  createdAt: '2026-08-19T20:00:00Z',
};

function service(): GroupService {
  return {
    listGroups: vi.fn(async () => []),
    createGroup: vi.fn(async () => group),
    getMembers: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({
      id: 'invite-1', groupId: group.id, token: '6ccccccc-cccc-4ccc-8ccc-cccccccccccc',
      expiresAt: '2026-08-26T20:00:00Z', maxUses: 25, useCount: 0, revokedAt: null,
    })),
    joinByInvite: vi.fn(async () => group.id),
    listInvites: vi.fn(async () => []),
    renameGroup: vi.fn(async () => undefined),
    revokeInvite: vi.fn(async () => undefined),
    setMemberRole: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    transferOwnership: vi.fn(async () => undefined),
    leaveGroup: vi.fn(async () => undefined),
  };
}

describe('GroupSetupController', () => {
  it('refreshes membership after successful group creation', async () => {
    const user = userEvent.setup();
    const api = service();
    const onMembershipReady = vi.fn(async () => undefined);
    render(
      <GroupSetupController
        onMembershipReady={onMembershipReady}
        service={api}
        userId="user-1"
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Iron Crew');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(api.createGroup).toHaveBeenCalledWith('user-1', { name: 'Iron Crew' });
    await waitFor(() => expect(onMembershipReady).toHaveBeenCalledOnce());
  });
});
