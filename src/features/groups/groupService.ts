import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  CreateGroupInput,
  CreateInviteOptions,
  GroupInvite,
  GroupMember,
  ManagedGroupInvite,
  GroupRole,
  GroupSummary,
} from './model';
import {
  assertValidCreateGroupInput,
  assertValidInviteOptions,
  assertValidInviteToken,
} from './validation';

type MembershipRow = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  status: 'ACTIVE' | 'REMOVED';
  joined_at: string;
};

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  profile_picture_path: string | null;
};

type InviteRow = {
  id: string;
  group_id: string;
  token: string;
  expires_at: string;
  max_uses: number;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
};

export interface GroupService {
  listGroups(userId: string): Promise<GroupSummary[]>;
  createGroup(userId: string, input: CreateGroupInput): Promise<GroupSummary>;
  getMembers(groupId: string): Promise<GroupMember[]>;
  createInvite(userId: string, groupId: string, options?: CreateInviteOptions): Promise<GroupInvite>;
  joinByInvite(invite: string): Promise<string>;
  listInvites(groupId: string): Promise<ManagedGroupInvite[]>;
  renameGroup(groupId: string, name: string): Promise<void>;
  revokeInvite(inviteId: string): Promise<void>;
  setMemberRole(groupId: string, targetUserId: string, role: Exclude<GroupRole, 'OWNER'>): Promise<void>;
  removeMember(groupId: string, targetUserId: string): Promise<void>;
  transferOwnership(groupId: string, targetUserId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
}

function mapInvite(row: InviteRow): GroupInvite {
  return {
    id: row.id,
    groupId: row.group_id,
    token: row.token,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    useCount: row.use_count,
    revokedAt: row.revoked_at,
  };
}

export function createGroupService(client: SupabaseClient = getSupabaseClient()): GroupService {
  return {
    async listGroups(userId) {
      const membershipsResult = await client
        .from('group_members')
        .select('group_id, user_id, role, status, joined_at')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE');

      if (membershipsResult.error) throw membershipsResult.error;
      const memberships = (membershipsResult.data ?? []) as MembershipRow[];
      if (memberships.length === 0) return [];

      const groupIds = memberships.map((membership) => membership.group_id);
      const [groupsResult, allMembersResult] = await Promise.all([
        client.from('groups').select('id, name, created_at').in('id', groupIds),
        client
          .from('group_members')
          .select('group_id, user_id, role, status, joined_at')
          .in('group_id', groupIds)
          .eq('status', 'ACTIVE'),
      ]);

      if (groupsResult.error) throw groupsResult.error;
      if (allMembersResult.error) throw allMembersResult.error;

      const groups = (groupsResult.data ?? []) as GroupRow[];
      const allMembers = (allMembersResult.data ?? []) as MembershipRow[];
      const groupById = new Map(groups.map((group) => [group.id, group]));
      const memberCounts = new Map<string, number>();
      for (const membership of allMembers) {
        memberCounts.set(membership.group_id, (memberCounts.get(membership.group_id) ?? 0) + 1);
      }

      return memberships
        .map((membership): GroupSummary | null => {
          const group = groupById.get(membership.group_id);
          if (!group) return null;
          return {
            id: group.id,
            name: group.name,
            memberCount: memberCounts.get(group.id) ?? 0,
            role: membership.role,
            joinedAt: membership.joined_at,
            createdAt: group.created_at,
          };
        })
        .filter((group): group is GroupSummary => group !== null)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    },

    async createGroup(_userId, input) {
      const name = assertValidCreateGroupInput(input);
      const result = await client.rpc('create_group', { p_name: name });

      if (result.error) throw result.error;
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
        throw new Error('Group was not created.');
      }

      const row = result.data as unknown as GroupRow;
      if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.created_at !== 'string') {
        throw new Error('Group creation returned an invalid response.');
      }

      return {
        id: row.id,
        name: row.name,
        memberCount: 1,
        role: 'OWNER',
        joinedAt: row.created_at,
        createdAt: row.created_at,
      };
    },

    async getMembers(groupId) {
      const membershipResult = await client
        .from('group_members')
        .select('group_id, user_id, role, status, joined_at')
        .eq('group_id', groupId)
        .eq('status', 'ACTIVE');

      if (membershipResult.error) throw membershipResult.error;
      const memberships = (membershipResult.data ?? []) as MembershipRow[];
      if (memberships.length === 0) return [];

      const profileResult = await client
        .from('profiles')
        .select('id, username, display_name, profile_picture_path')
        .in('id', memberships.map((membership) => membership.user_id));

      if (profileResult.error) throw profileResult.error;
      const profiles = (profileResult.data ?? []) as ProfileRow[];
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

      return memberships
        .map((membership): GroupMember | null => {
          const profile = profileById.get(membership.user_id);
          if (!profile) return null;
          return {
            userId: membership.user_id,
            username: profile.username,
            displayName: profile.display_name,
            profilePicturePath: profile.profile_picture_path,
            profilePictureUrl: profile.profile_picture_path
              ? client.storage.from('profile-pictures').getPublicUrl(profile.profile_picture_path).data.publicUrl
              : null,
            role: membership.role,
            joinedAt: membership.joined_at,
          };
        })
        .filter((member): member is GroupMember => member !== null)
        .sort((a, b) => {
          const roleOrder: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
          return roleOrder[a.role] - roleOrder[b.role] || a.joinedAt.localeCompare(b.joinedAt);
        });
    },

    async createInvite(userId, groupId, options = {}) {
      assertValidInviteOptions(options);
      const values: Record<string, unknown> = { group_id: groupId, created_by: userId };
      if (options.maxUses !== undefined) values.max_uses = options.maxUses;
      if (options.expiresAt !== undefined) values.expires_at = options.expiresAt;

      const result = await client
        .from('group_invites')
        .insert(values)
        .select('id, group_id, token, expires_at, max_uses, use_count, revoked_at, created_at')
        .single();

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Invite was not created.');
      return mapInvite(result.data as InviteRow);
    },

    async joinByInvite(invite) {
      const token = assertValidInviteToken(invite);
      const result = await client.rpc('join_group_by_invite', { p_token: token });
      if (result.error) throw result.error;
      if (typeof result.data !== 'string') throw new Error('Group join did not return a group id.');
      return result.data;
    },

    async listInvites(groupId) {
      const result = await client
        .from('group_invites')
        .select('id, group_id, token, expires_at, max_uses, use_count, revoked_at, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return ((result.data ?? []) as InviteRow[]).map((row) => ({
        ...mapInvite(row),
        createdAt: row.created_at,
      }));
    },

    async renameGroup(groupId, name) {
      const normalized = assertValidCreateGroupInput({ name });
      const result = await client.from('groups').update({ name: normalized }).eq('id', groupId);
      if (result.error) throw result.error;
    },

    async revokeInvite(inviteId) {
      const result = await client.from('group_invites').update({ revoked_at: new Date().toISOString() }).eq('id', inviteId);
      if (result.error) throw result.error;
    },

    async setMemberRole(groupId, targetUserId, role) {
      const result = await client.rpc('set_group_member_role', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
        p_role: role,
      });
      if (result.error) throw result.error;
    },

    async removeMember(groupId, targetUserId) {
      const result = await client.rpc('remove_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });
      if (result.error) throw result.error;
    },

    async transferOwnership(groupId, targetUserId) {
      const result = await client.rpc('transfer_group_ownership', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });
      if (result.error) throw result.error;
    },

    async leaveGroup(groupId) {
      const result = await client.rpc('leave_group', { p_group_id: groupId });
      if (result.error) throw result.error;
    },
  };
}
