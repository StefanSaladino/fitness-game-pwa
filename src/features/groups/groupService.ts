import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { CreateGroupInput, GroupInvite, GroupMember, GroupRole, GroupSummary, ManagedGroupInvite, PendingGroupInvite } from './model';
import { assertValidCreateGroupInput } from './validation';

type MembershipRow = { group_id:string; user_id:string; role:GroupRole; status:'ACTIVE'|'REMOVED'; joined_at:string };
type GroupRow = { id:string; name:string; created_at:string };
type ProfileRow = { id:string; username:string; display_name:string; profile_picture_path:string|null };
type OutgoingInviteRow = { id:string; group_id:string; invited_user_id:string; invited_username:string; invited_display_name:string; created_at:string };
type IncomingInviteRow = { id:string; group_id:string; group_name:string; invited_by_user_id:string; invited_by_username:string; invited_by_display_name:string; created_at:string };

export interface GroupService {
  listGroups(userId:string):Promise<GroupSummary[]>;
  createGroup(userId:string,input:CreateGroupInput):Promise<GroupSummary>;
  getMembers(groupId:string):Promise<GroupMember[]>;
  createInvite(userId:string,groupId:string,recipient:string):Promise<GroupInvite>;
  /** @deprecated Reusable join codes are retired. */
  joinByInvite(invite:string):Promise<string>;
  listInvites(groupId:string):Promise<ManagedGroupInvite[]>;
  listPendingInvites():Promise<PendingGroupInvite[]>;
  acceptInvite(inviteId:string):Promise<string>;
  declineInvite(inviteId:string):Promise<void>;
  renameGroup(groupId:string,name:string):Promise<void>;
  revokeInvite(inviteId:string):Promise<void>;
  setMemberRole(groupId:string,targetUserId:string,role:Exclude<GroupRole,'OWNER'>):Promise<void>;
  removeMember(groupId:string,targetUserId:string):Promise<void>;
  transferOwnership(groupId:string,targetUserId:string):Promise<void>;
  leaveGroup(groupId:string):Promise<void>;
}

function mapOutgoing(row:OutgoingInviteRow):GroupInvite {
  return { id:row.id, groupId:row.group_id, invitedUserId:row.invited_user_id, invitedUsername:row.invited_username, invitedDisplayName:row.invited_display_name, createdAt:row.created_at };
}
function mapIncoming(row:IncomingInviteRow):PendingGroupInvite {
  return { id:row.id, groupId:row.group_id, groupName:row.group_name, invitedByUserId:row.invited_by_user_id, invitedByUsername:row.invited_by_username, invitedByDisplayName:row.invited_by_display_name, createdAt:row.created_at };
}

export function createGroupService(client:SupabaseClient=getSupabaseClient()):GroupService {
  return {
    async listGroups(userId) {
      const membershipsResult=await client.from('group_members').select('group_id, user_id, role, status, joined_at').eq('user_id',userId).eq('status','ACTIVE');
      if(membershipsResult.error) throw membershipsResult.error;
      const memberships=(membershipsResult.data??[]) as MembershipRow[];
      if(!memberships.length) return [];
      const ids=memberships.map(m=>m.group_id);
      const [groupsResult,allMembersResult]=await Promise.all([
        client.from('groups').select('id, name, created_at').in('id',ids),
        client.from('group_members').select('group_id, user_id, role, status, joined_at').in('group_id',ids).eq('status','ACTIVE'),
      ]);
      if(groupsResult.error) throw groupsResult.error;
      if(allMembersResult.error) throw allMembersResult.error;
      const groups=(groupsResult.data??[]) as GroupRow[];
      const all=(allMembersResult.data??[]) as MembershipRow[];
      const byId=new Map(groups.map(g=>[g.id,g]));
      const counts=new Map<string,number>();
      for(const m of all) counts.set(m.group_id,(counts.get(m.group_id)??0)+1);
      return memberships.map((m):GroupSummary|null=>{
        const g=byId.get(m.group_id); if(!g) return null;
        return {id:g.id,name:g.name,memberCount:counts.get(g.id)??0,role:m.role,joinedAt:m.joined_at,createdAt:g.created_at};
      }).filter((g):g is GroupSummary=>g!==null).sort((a,b)=>a.joinedAt.localeCompare(b.joinedAt));
    },
    async createGroup(_userId,input) {
      const name=assertValidCreateGroupInput(input);
      const result=await client.rpc('create_group',{p_name:name});
      if(result.error) throw result.error;
      if(!result.data||typeof result.data!=='object'||Array.isArray(result.data)) throw new Error('Group was not created.');
      const row=result.data as unknown as GroupRow;
      if(typeof row.id!=='string'||typeof row.name!=='string'||typeof row.created_at!=='string') throw new Error('Group creation returned an invalid response.');
      return {id:row.id,name:row.name,memberCount:1,role:'OWNER',joinedAt:row.created_at,createdAt:row.created_at};
    },
    async getMembers(groupId) {
      const mr=await client.from('group_members').select('group_id, user_id, role, status, joined_at').eq('group_id',groupId).eq('status','ACTIVE');
      if(mr.error) throw mr.error;
      const memberships=(mr.data??[]) as MembershipRow[];
      if(!memberships.length) return [];
      const pr=await client.from('profiles').select('id, username, display_name, profile_picture_path').in('id',memberships.map(m=>m.user_id));
      if(pr.error) throw pr.error;
      const profiles=(pr.data??[]) as ProfileRow[];
      const byId=new Map(profiles.map(p=>[p.id,p]));
      return memberships.map((m):GroupMember|null=>{
        const p=byId.get(m.user_id); if(!p) return null;
        return {userId:m.user_id,username:p.username,displayName:p.display_name,profilePicturePath:p.profile_picture_path,
          profilePictureUrl:p.profile_picture_path?client.storage.from('profile-pictures').getPublicUrl(p.profile_picture_path).data.publicUrl:null,
          role:m.role,joinedAt:m.joined_at};
      }).filter((m):m is GroupMember=>m!==null);
    },
    async createInvite(_userId,groupId,recipient) {
      const value=recipient.trim();
      if(!value) throw new Error('Enter a username or invite ID.');
      const r=await client.rpc('create_group_invite',{p_group_id:groupId,p_recipient:value});
      if(r.error) throw r.error;
      if(!r.data||typeof r.data!=='object'||Array.isArray(r.data)) throw new Error('Invite was not created.');
      return mapOutgoing(r.data as unknown as OutgoingInviteRow);
    },
    async joinByInvite() { throw new Error('Reusable invite codes are no longer supported.'); },
    async listInvites(groupId) {
      const r=await client.rpc('get_group_pending_invites',{p_group_id:groupId});
      if(r.error) throw r.error;
      return ((r.data??[]) as OutgoingInviteRow[]).map(mapOutgoing);
    },
    async listPendingInvites() {
      const r=await client.rpc('get_my_pending_group_invites');
      if(r.error) throw r.error;
      return ((r.data??[]) as IncomingInviteRow[]).map(mapIncoming);
    },
    async acceptInvite(inviteId) {
      const r=await client.rpc('accept_group_invite',{p_invite_id:inviteId});
      if(r.error) throw r.error;
      if(typeof r.data!=='string') throw new Error('Invite acceptance did not return a group id.');
      return r.data;
    },
    async declineInvite(inviteId) {
      const r=await client.rpc('decline_group_invite',{p_invite_id:inviteId});
      if(r.error) throw r.error;
    },
    async renameGroup(groupId,name) {
      const normalized=assertValidCreateGroupInput({name});
      const r=await client.from('groups').update({name:normalized}).eq('id',groupId); if(r.error) throw r.error;
    },
    async revokeInvite(inviteId) { const r=await client.rpc('revoke_group_invite',{p_invite_id:inviteId}); if(r.error) throw r.error; },
    async setMemberRole(groupId,targetUserId,role) { const r=await client.rpc('set_group_member_role',{p_group_id:groupId,p_target_user_id:targetUserId,p_role:role}); if(r.error) throw r.error; },
    async removeMember(groupId,targetUserId) { const r=await client.rpc('remove_group_member',{p_group_id:groupId,p_target_user_id:targetUserId}); if(r.error) throw r.error; },
    async transferOwnership(groupId,targetUserId) { const r=await client.rpc('transfer_group_ownership',{p_group_id:groupId,p_target_user_id:targetUserId}); if(r.error) throw r.error; },
    async leaveGroup(groupId) { const r=await client.rpc('leave_group',{p_group_id:groupId}); if(r.error) throw r.error; },
  };
}
