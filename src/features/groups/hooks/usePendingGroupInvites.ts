import { useCallback, useEffect, useRef, useState } from 'react';
import { createGroupService, type GroupService } from '../groupService';
import { toUserFacingGroupError } from '../groupMessages';
import type { PendingGroupInvite } from '../model';

export function usePendingGroupInvites(service:GroupService|undefined,onMembershipReady?:()=>Promise<unknown>|unknown){
  const ref=useRef<GroupService|null>(null); if(!ref.current) ref.current=service??createGroupService();
  const api=ref.current;
  const [invites,setInvites]=useState<PendingGroupInvite[]>([]);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [error,setError]=useState(''); const [busyAction,setBusyAction]=useState<string|null>(null);
  const refresh=useCallback(async()=>{setStatus('loading');setError('');try{setInvites(await api.listPendingInvites());setStatus('ready');}catch(e){setError(toUserFacingGroupError(e));setStatus('error');}},[api]);
  useEffect(()=>{void refresh();},[refresh]);
  const accept=useCallback(async(id:string)=>{setBusyAction(`accept:${id}`);setError('');try{const groupId=await api.acceptInvite(id);await onMembershipReady?.();await refresh();return groupId;}catch(e){setError(toUserFacingGroupError(e));return null;}finally{setBusyAction(null);}},[api,onMembershipReady,refresh]);
  const decline=useCallback(async(id:string)=>{setBusyAction(`decline:${id}`);setError('');try{await api.declineInvite(id);await refresh();return true;}catch(e){setError(toUserFacingGroupError(e));return false;}finally{setBusyAction(null);}},[api,refresh]);
  return {invites,status,error,busyAction,retry:refresh,accept,decline};
}
