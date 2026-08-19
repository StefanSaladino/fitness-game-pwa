import { useCallback, useEffect, useRef, useState } from 'react';
import { createGroupService, type GroupService } from '../groupService';
import { toUserFacingGroupError } from '../groupMessages';
import type { GroupInvite, GroupMember, GroupSummary, ManagedGroupInvite } from '../model';

export type GroupAdministrationStatus = 'loading' | 'ready' | 'error';

interface UseGroupAdministrationOptions {
  userId: string;
  group: GroupSummary;
  service?: GroupService;
  onGroupsChanged?: () => Promise<unknown> | unknown;
}

export function useGroupAdministration({ userId, group, service: injectedService, onGroupsChanged }: UseGroupAdministrationOptions) {
  const serviceRef = useRef<GroupService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupService();
  const service = serviceRef.current;

  const [status, setStatus] = useState<GroupAdministrationStatus>('loading');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<ManagedGroupInvite[]>([]);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canManageInvites = group.role === 'OWNER' || group.role === 'ADMIN';

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [nextMembers, nextInvites] = await Promise.all([
        service.getMembers(group.id),
        canManageInvites ? service.listInvites(group.id) : Promise.resolve([]),
      ]);
      setMembers(nextMembers);
      setInvites(nextInvites);
      setStatus('ready');
    } catch (nextError) {
      setError(toUserFacingGroupError(nextError));
      setStatus('error');
    }
  }, [canManageInvites, group.id, service]);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = useCallback(async <T,>(key: string, action: () => Promise<T>, refreshMembers = false, refreshGroups = false): Promise<T | null> => {
    setBusyAction(key);
    setError('');
    try {
      const value = await action();
      if (refreshGroups) await onGroupsChanged?.();
      if (refreshMembers) await refresh();
      return value;
    } catch (nextError) {
      setError(toUserFacingGroupError(nextError));
      return null;
    } finally {
      setBusyAction(null);
    }
  }, [onGroupsChanged, refresh]);

  return {
    status,
    members,
    invites,
    error,
    busyAction,
    retry: refresh,

    rename: (name: string) => run('rename', () => service.renameGroup(group.id, name), false, true),

    async createInvite(): Promise<GroupInvite | null> {
      const invite = await run('invite:create', () => service.createInvite(userId, group.id));
      if (invite) await refresh();
      return invite;
    },

    async revokeInvite(inviteId: string): Promise<boolean> {
      const result = await run(`invite:${inviteId}`, () => service.revokeInvite(inviteId));
      if (result === null) return false;
      await refresh();
      return true;
    },

    setMemberRole: (targetUserId: string, role: 'ADMIN' | 'MEMBER') =>
      run(`role:${targetUserId}`, () => service.setMemberRole(group.id, targetUserId, role), true, true),

    removeMember: (targetUserId: string) =>
      run(`remove:${targetUserId}`, () => service.removeMember(group.id, targetUserId), true, true),

    transferOwnership: (targetUserId: string) =>
      run(`transfer:${targetUserId}`, () => service.transferOwnership(group.id, targetUserId), true, true),

    leaveGroup: () => run('leave', () => service.leaveGroup(group.id), false, true),
  };
}
