import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createGroupService } from './groupService';

function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'insert', 'update', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };
}

function clientFor(tableQueries: Record<string, ReturnType<typeof query>[]> = {}) {
  const indexes = new Map<string, number>();
  const from = vi.fn((table: string) => {
    const index = indexes.get(table) ?? 0;
    indexes.set(table, index + 1);
    const value = tableQueries[table]?.[index];
    if (!value) throw new Error(`Unexpected table query: ${table} #${index}`);
    return value;
  });
  const rpc = vi.fn();
  const storage = {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } })),
    })),
  };
  return { client: { from, rpc, storage } as unknown as SupabaseClient, from, rpc };
}

const outgoing = {
  id: 'invite-1', group_id: 'group-1', invited_user_id: 'member', invited_username: 'alex',
  invited_display_name: 'Alex', created_at: '2026-08-20T00:00:00Z',
};

describe('group service', () => {
  it('loads every active group with role and scalable member counts', async () => {
    const ownMemberships = query({
      data: [
        { group_id: 'group-a', user_id: 'user-1', role: 'OWNER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' },
        { group_id: 'group-b', user_id: 'user-1', role: 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-10T00:00:00Z' },
      ], error: null,
    });
    const allMemberships = query({
      data: [
        ...Array.from({ length: 10 }, (_, index) => ({ group_id: 'group-a', user_id: `a-${index}`, role: index === 0 ? 'OWNER' : 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' })),
        ...Array.from({ length: 3 }, (_, index) => ({ group_id: 'group-b', user_id: `b-${index}`, role: index === 0 ? 'OWNER' : 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-10T00:00:00Z' })),
      ], error: null,
    });
    const groups = query({ data: [
      { id: 'group-a', name: 'Heavy Crew', created_at: '2026-08-01T00:00:00Z' },
      { id: 'group-b', name: 'Friday Lifters', created_at: '2026-08-09T00:00:00Z' },
    ], error: null });
    const fake = clientFor({ group_members: [ownMemberships, allMemberships], groups: [groups] });
    await expect(createGroupService(fake.client).listGroups('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'group-a', memberCount: 10, role: 'OWNER' }),
      expect.objectContaining({ id: 'group-b', memberCount: 3, role: 'MEMBER' }),
    ]);
  });

  it('normalizes a group name and creates it through the authenticated RPC', async () => {
    const fake = clientFor();
    fake.rpc.mockResolvedValue({ data: { id: 'group-1', name: 'Iron Crew', created_at: '2026-08-19T20:00:00Z' }, error: null });
    await expect(createGroupService(fake.client).createGroup('user-1', { name: '  Iron   Crew ' })).resolves.toEqual(
      expect.objectContaining({ id: 'group-1', name: 'Iron Crew', memberCount: 1, role: 'OWNER' }),
    );
    expect(fake.rpc).toHaveBeenCalledWith('create_group', { p_name: 'Iron Crew' });
    expect(fake.from).not.toHaveBeenCalledWith('groups');
  });

  it('combines membership roles with shared-group profile identity', async () => {
    const memberships = query({ data: [
      { group_id: 'group-1', user_id: 'owner', role: 'OWNER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' },
      { group_id: 'group-1', user_id: 'member', role: 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-02T00:00:00Z' },
    ], error: null });
    const profiles = query({ data: [
      { id: 'member', username: 'alex', display_name: 'Alex', profile_picture_path: null },
      { id: 'owner', username: 'stefan', display_name: 'Stefan', profile_picture_path: 'owner/photo.webp' },
    ], error: null });
    const fake = clientFor({ group_members: [memberships], profiles: [profiles] });
    await expect(createGroupService(fake.client).getMembers('group-1')).resolves.toEqual([
      expect.objectContaining({ userId: 'owner', role: 'OWNER', displayName: 'Stefan' }),
      expect.objectContaining({ userId: 'member', role: 'MEMBER', displayName: 'Alex' }),
    ]);
  });

  it('creates a person-specific invite by username through the guarded RPC', async () => {
    const fake = clientFor();
    fake.rpc.mockResolvedValue({ data: outgoing, error: null });
    const invite = await createGroupService(fake.client).createInvite('owner', 'group-1', '@alex');
    expect(fake.rpc).toHaveBeenCalledWith('create_group_invite', { p_group_id: 'group-1', p_recipient: '@alex' });
    expect(invite).toEqual(expect.objectContaining({ invitedUserId: 'member', invitedUsername: 'alex' }));
  });

  it('supports the stable profile invite ID as the same targeted lookup path', async () => {
    const fake = clientFor();
    fake.rpc.mockResolvedValue({ data: outgoing, error: null });
    await createGroupService(fake.client).createInvite('owner', 'group-1', 'FG-1A2B3C4D5E');
    expect(fake.rpc).toHaveBeenCalledWith('create_group_invite', { p_group_id: 'group-1', p_recipient: 'FG-1A2B3C4D5E' });
  });

  it('loads outgoing pending invitations and the signed-in recipient inbox through RPCs', async () => {
    const fake = clientFor();
    fake.rpc
      .mockResolvedValueOnce({ data: [outgoing], error: null })
      .mockResolvedValueOnce({ data: [{
        id: 'invite-2', group_id: 'group-2', group_name: 'Night Crew', invited_by_user_id: 'owner-2',
        invited_by_username: 'jordan', invited_by_display_name: 'Jordan', created_at: '2026-08-20T01:00:00Z',
      }], error: null });
    const service = createGroupService(fake.client);
    expect(await service.listInvites('group-1')).toEqual([expect.objectContaining({ invitedUsername: 'alex' })]);
    expect(await service.listPendingInvites()).toEqual([expect.objectContaining({ groupName: 'Night Crew', invitedByUsername: 'jordan' })]);
    expect(fake.rpc).toHaveBeenNthCalledWith(1, 'get_group_pending_invites', { p_group_id: 'group-1' });
    expect(fake.rpc).toHaveBeenNthCalledWith(2, 'get_my_pending_group_invites');
  });

  it('accepts, declines, and revokes invitations only through lifecycle RPCs', async () => {
    const fake = clientFor();
    fake.rpc
      .mockResolvedValueOnce({ data: 'group-1', error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const service = createGroupService(fake.client);
    await expect(service.acceptInvite('invite-1')).resolves.toBe('group-1');
    await service.declineInvite('invite-2');
    await service.revokeInvite('invite-3');
    expect(fake.rpc).toHaveBeenNthCalledWith(1, 'accept_group_invite', { p_invite_id: 'invite-1' });
    expect(fake.rpc).toHaveBeenNthCalledWith(2, 'decline_group_invite', { p_invite_id: 'invite-2' });
    expect(fake.rpc).toHaveBeenNthCalledWith(3, 'revoke_group_invite', { p_invite_id: 'invite-3' });
  });

  it('retains group rename and member administration behind their existing boundaries', async () => {
    const rename = query({ data: null, error: null });
    const fake = clientFor({ groups: [rename] });
    fake.rpc.mockResolvedValue({ data: null, error: null });
    const service = createGroupService(fake.client);
    await service.renameGroup('group-1', '  Heavy   Crew  ');
    await service.setMemberRole('group-1', 'member-1', 'ADMIN');
    await service.removeMember('group-1', 'member-2');
    await service.transferOwnership('group-1', 'member-1');
    await service.leaveGroup('group-1');
    expect(rename.update).toHaveBeenCalledWith({ name: 'Heavy Crew' });
    expect(fake.rpc).toHaveBeenNthCalledWith(1, 'set_group_member_role', expect.any(Object));
    expect(fake.rpc).toHaveBeenNthCalledWith(4, 'leave_group', { p_group_id: 'group-1' });
  });

  it('rejects empty targeted recipients before the network call', async () => {
    const fake = clientFor();
    await expect(createGroupService(fake.client).createInvite('owner', 'group-1', '   ')).rejects.toThrow(/username or invite id/i);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it('does not support reusable group join codes anymore', async () => {
    const fake = clientFor();
    await expect(createGroupService(fake.client).joinByInvite('legacy-code')).rejects.toThrow(/no longer supported/i);
    expect(fake.rpc).not.toHaveBeenCalled();
  });
});
