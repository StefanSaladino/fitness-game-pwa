import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import { usePendingGroupInvites } from './usePendingGroupInvites';

function service(): GroupService {
  return {
    listGroups:vi.fn(async()=>[]), createGroup:vi.fn() as GroupService['createGroup'], getMembers:vi.fn(async()=>[]),
    createInvite:vi.fn() as GroupService['createInvite'], joinByInvite:vi.fn() as GroupService['joinByInvite'], listInvites:vi.fn(async()=>[]),
    listPendingInvites:vi.fn(async()=>[{id:'invite-1',groupId:'group-1',groupName:'Iron Crew',invitedByUserId:'owner-1',invitedByUsername:'alex',invitedByDisplayName:'Alex',createdAt:'x'}]),
    acceptInvite:vi.fn(async()=> 'group-1'), declineInvite:vi.fn(async()=>undefined), renameGroup:vi.fn(async()=>undefined), revokeInvite:vi.fn(async()=>undefined),
    setMemberRole:vi.fn(async()=>undefined), removeMember:vi.fn(async()=>undefined), transferOwnership:vi.fn(async()=>undefined), leaveGroup:vi.fn(async()=>undefined),
  };
}

describe('usePendingGroupInvites',()=>{
  it('loads the signed-in user invitation inbox',async()=>{const api=service();const {result}=renderHook(()=>usePendingGroupInvites(api));await waitFor(()=>expect(result.current.status).toBe('ready'));expect(result.current.invites[0]?.groupName).toBe('Iron Crew');expect(api.listPendingInvites).toHaveBeenCalled();});
  it('accepts through the service and refreshes membership',async()=>{const api=service();const ready=vi.fn(async()=>undefined);const {result}=renderHook(()=>usePendingGroupInvites(api,ready));await waitFor(()=>expect(result.current.status).toBe('ready'));await act(async()=>{await result.current.accept('invite-1');});expect(api.acceptInvite).toHaveBeenCalledWith('invite-1');expect(ready).toHaveBeenCalled();});
});
