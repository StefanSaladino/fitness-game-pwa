import { useCallback,useEffect,useRef,useState } from 'react';
import { createGroupService,type GroupService } from '../groupService';
import { toUserFacingGroupError } from '../groupMessages';
import type { GroupInvite,GroupMember,GroupSummary,ManagedGroupInvite,PendingGroupInvite } from '../model';
interface Options{userId:string;group:GroupSummary;service?:GroupService;onGroupsChanged?:()=>Promise<unknown>|unknown}
export function useGroupAdministration({userId,group,service:injected,onGroupsChanged}:Options){
  const ref=useRef<GroupService|null>(null);if(!ref.current)ref.current=injected??createGroupService();const service=ref.current;
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[members,setMembers]=useState<GroupMember[]>([]),[invites,setInvites]=useState<ManagedGroupInvite[]>([]),[pendingInvites,setPending]=useState<PendingGroupInvite[]>([]),[error,setError]=useState(''),[busyAction,setBusy]=useState<string|null>(null);
  const canManage=group.role==='OWNER'||group.role==='ADMIN';
  const refresh=useCallback(async()=>{setStatus('loading');setError('');try{
    const [m,o,p]=await Promise.all([service.getMembers(group.id),canManage?service.listInvites(group.id):Promise.resolve([]),service.listPendingInvites()]);
    setMembers(m);setInvites(o);setPending(p);setStatus('ready');
  }catch(e){setError(toUserFacingGroupError(e));setStatus('error');}},[canManage,group.id,service]);
  useEffect(()=>{void refresh();},[refresh]);
  const run=useCallback(async<T,>(key:string,action:()=>Promise<T>,refreshMembers=false,refreshGroups=false):Promise<T|null>=>{setBusy(key);setError('');try{const v=await action();if(refreshGroups)await onGroupsChanged?.();if(refreshMembers)await refresh();return v;}catch(e){setError(toUserFacingGroupError(e));return null;}finally{setBusy(null);}},[onGroupsChanged,refresh]);
  return {status,members,invites,pendingInvites,error,busyAction,retry:refresh,
    rename:(name:string)=>run('rename',()=>service.renameGroup(group.id,name),false,true),
    async createInvite(recipient:string):Promise<GroupInvite|null>{const invite=await run('invite:create',()=>service.createInvite(userId,group.id,recipient));if(invite)await refresh();return invite;},
    async revokeInvite(id:string){const v=await run(`invite:${id}`,()=>service.revokeInvite(id));if(v===null)return false;await refresh();return true;},
    async acceptInvite(id:string){const v=await run(`accept:${id}`,()=>service.acceptInvite(id),false,true);if(v)await refresh();return v;},
    async declineInvite(id:string){const v=await run(`decline:${id}`,()=>service.declineInvite(id));if(v===null)return false;await refresh();return true;},
    setMemberRole:(id:string,role:'ADMIN'|'MEMBER')=>run(`role:${id}`,()=>service.setMemberRole(group.id,id,role),true,true),
    removeMember:(id:string)=>run(`remove:${id}`,()=>service.removeMember(group.id,id),true,true),
    transferOwnership:(id:string)=>run(`transfer:${id}`,()=>service.transferOwnership(group.id,id),true,true),
    leaveGroup:()=>run('leave',()=>service.leaveGroup(group.id),false,true),
  };
}
