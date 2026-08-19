import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createGroupService } from './groupService';

const TOKEN = '6ccccccc-cccc-4ccc-8ccc-cccccccccccc';

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

function clientFor(tableQueries: Record<string, ReturnType<typeof query>[]>, rpcResult = { data: null as unknown, error: null as unknown }) {
  const indexes = new Map<string, number>();
  const from = vi.fn((table: string) => {
    const index = indexes.get(table) ?? 0;
    indexes.set(table, index + 1);
    const value = tableQueries[table]?.[index];
    if (!value) throw new Error(`Unexpected table query: ${table} #${index}`);
    return value;
  });
  const rpc = vi.fn(async () => rpcResult);
  const storage = {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } })),
    })),
  };
  return { client: { from, rpc, storage } as unknown as SupabaseClient, from, rpc };
}

describe('group service', () => {
  it('loads every active group with role and scalable member counts', async () => {
    const ownMemberships = query({
      data: [
        { group_id: 'group-a', user_id: 'user-1', role: 'OWNER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' },
        { group_id: 'group-b', user_id: 'user-1', role: 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-10T00:00:00Z' },
      ],
      error: null,
    });
    const allMemberships = query({
      data: [
        ...Array.from({ length: 10 }, (_, index) => ({ group_id: 'group-a', user_id: `a-${index}`, role: index === 0 ? 'OWNER' : 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' })),
        ...Array.from({ length: 3 }, (_, index) => ({ group_id: 'group-b', user_id: `b-${index}`, role: index === 0 ? 'OWNER' : 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-10T00:00:00Z' })),
      ],
      error: null,
    });
    const groups = query({
      data: [
        { id: 'group-a', name: 'Heavy Crew', created_at: '2026-08-01T00:00:00Z' },
        { id: 'group-b', name: 'Friday Lifters', created_at: '2026-08-09T00:00:00Z' },
      ],
      error: null,
    });

    const fake = clientFor({ group_members: [ownMemberships, allMemberships], groups: [groups] });
    const service = createGroupService(fake.client);

    await expect(service.listGroups('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'group-a', memberCount: 10, role: 'OWNER' }),
      expect.objectContaining({ id: 'group-b', memberCount: 3, role: 'MEMBER' }),
    ]);
    expect(ownMemberships.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('normalizes a group name and relies on the database owner trigger', async () => {
    const create = query({ data: { id: 'group-1', name: 'Iron Crew', created_at: '2026-08-19T20:00:00Z' }, error: null });
    const fake = clientFor({ groups: [create] });
    const service = createGroupService(fake.client);

    await expect(service.createGroup('user-1', { name: '  Iron   Crew ' })).resolves.toEqual({
      id: 'group-1',
      name: 'Iron Crew',
      memberCount: 1,
      role: 'OWNER',
      joinedAt: '2026-08-19T20:00:00Z',
      createdAt: '2026-08-19T20:00:00Z',
    });
    expect(create.insert).toHaveBeenCalledWith({ name: 'Iron Crew', created_by: 'user-1' });
  });

  it('combines membership roles with shared-group profile identity', async () => {
    const memberships = query({
      data: [
        { group_id: 'group-1', user_id: 'owner', role: 'OWNER', status: 'ACTIVE', joined_at: '2026-08-01T00:00:00Z' },
        { group_id: 'group-1', user_id: 'member', role: 'MEMBER', status: 'ACTIVE', joined_at: '2026-08-02T00:00:00Z' },
      ],
      error: null,
    });
    const profiles = query({
      data: [
        { id: 'member', username: 'alex', display_name: 'Alex', profile_picture_path: null },
        { id: 'owner', username: 'stefan', display_name: 'Stefan', profile_picture_path: 'owner/photo.webp' },
      ],
      error: null,
    });
    const fake = clientFor({ group_members: [memberships], profiles: [profiles] });
    const service = createGroupService(fake.client);

    await expect(service.getMembers('group-1')).resolves.toEqual([
      expect.objectContaining({ userId: 'owner', role: 'OWNER', displayName: 'Stefan', profilePicturePath: 'owner/photo.webp' }),
      expect.objectContaining({ userId: 'member', role: 'MEMBER', displayName: 'Alex' }),
    ]);
  });

  it('creates an invite without overriding database defaults unless requested', async () => {
    const invite = query({
      data: {
        id: 'invite-1', group_id: 'group-1', token: TOKEN,
        expires_at: '2026-08-26T20:00:00Z', max_uses: 25, use_count: 0, revoked_at: null,
      },
      error: null,
    });
    const fake = clientFor({ group_invites: [invite] });
    const service = createGroupService(fake.client);

    await expect(service.createInvite('user-1', 'group-1')).resolves.toEqual(expect.objectContaining({
      groupId: 'group-1', token: TOKEN, maxUses: 25, useCount: 0,
    }));
    expect(invite.insert).toHaveBeenCalledWith({ group_id: 'group-1', created_by: 'user-1' });
  });

  it('normalizes an invite link and joins only through the security-definer RPC', async () => {
    const fake = clientFor({}, { data: 'group-1', error: null });
    const service = createGroupService(fake.client);

    await expect(service.joinByInvite(`https://app.example.com/join/${TOKEN}`)).resolves.toBe('group-1');
    expect(fake.rpc).toHaveBeenCalledWith('join_group_by_invite', { p_token: TOKEN });
  });

  it('lists invite administration state and normalizes group renames', async () => {
    const invites = query({
      data: [{
        id: 'invite-1', group_id: 'group-1', token: TOKEN,
        expires_at: '2099-08-26T20:00:00Z', max_uses: 25, use_count: 3,
        revoked_at: null, created_at: '2026-08-19T20:00:00Z',
      }],
      error: null,
    });
    const rename = query({ data: null, error: null });
    const fake = clientFor({ group_invites: [invites], groups: [rename] });
    const service = createGroupService(fake.client);

    await expect(service.listInvites('group-1')).resolves.toEqual([
      expect.objectContaining({ token: TOKEN, useCount: 3, createdAt: '2026-08-19T20:00:00Z' }),
    ]);
    await expect(service.renameGroup('group-1', '  Heavy   Crew  ')).resolves.toBeUndefined();
    expect(rename.update).toHaveBeenCalledWith({ name: 'Heavy Crew' });
    expect(rename.eq).toHaveBeenCalledWith('id', 'group-1');
  });

  it('keeps member-role, removal, transfer, and leave mutations behind RPCs', async () => {
    const fake = clientFor({}, { data: null, error: null });
    const service = createGroupService(fake.client);

    await service.setMemberRole('group-1', 'member-1', 'ADMIN');
    await service.removeMember('group-1', 'member-2');
    await service.transferOwnership('group-1', 'member-1');
    await service.leaveGroup('group-1');

    expect(fake.rpc).toHaveBeenNthCalledWith(1, 'set_group_member_role', {
      p_group_id: 'group-1', p_target_user_id: 'member-1', p_role: 'ADMIN',
    });
    expect(fake.rpc).toHaveBeenNthCalledWith(2, 'remove_group_member', {
      p_group_id: 'group-1', p_target_user_id: 'member-2',
    });
    expect(fake.rpc).toHaveBeenNthCalledWith(3, 'transfer_group_ownership', {
      p_group_id: 'group-1', p_target_user_id: 'member-1',
    });
    expect(fake.rpc).toHaveBeenNthCalledWith(4, 'leave_group', { p_group_id: 'group-1' });
  });

  it('revokes invite access through the RLS-protected invite row', async () => {
    const revoke = query({ data: null, error: null });
    const fake = clientFor({ group_invites: [revoke] });
    const service = createGroupService(fake.client);

    await expect(service.revokeInvite('invite-1')).resolves.toBeUndefined();
    expect(revoke.update).toHaveBeenCalledWith(expect.objectContaining({ revoked_at: expect.any(String) }));
    expect(revoke.eq).toHaveBeenCalledWith('id', 'invite-1');
  });

});
