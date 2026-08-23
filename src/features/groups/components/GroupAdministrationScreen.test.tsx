import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupMember, GroupSummary, ManagedGroupInvite } from '../model';
import { GroupAdministrationScreen } from './GroupAdministrationScreen';

const profile: OnboardingProfile = {
  id: 'owner-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', profileCode: 'FG-1A2B3C4D5E', preferredWeightUnit: 'KG',
};
const ownerGroup: GroupSummary = { id:'group-1', name:'Iron Crew', memberCount:3, role:'OWNER', joinedAt:'2026-08-18T00:00:00Z', createdAt:'2026-08-18T00:00:00Z' };
const members: GroupMember[] = [
  { userId:'owner-1', username:'stefan', displayName:'Stefan', profilePicturePath:null, profilePictureUrl:null, role:'OWNER', joinedAt:'2026-08-18T00:00:00Z' },
  { userId:'admin-1', username:'alex', displayName:'Alex', profilePicturePath:null, profilePictureUrl:null, role:'ADMIN', joinedAt:'2026-08-18T01:00:00Z' },
  { userId:'member-1', username:'sam', displayName:'Sam', profilePicturePath:null, profilePictureUrl:null, role:'MEMBER', joinedAt:'2026-08-18T02:00:00Z' },
];
const invite: ManagedGroupInvite = { id:'invite-1', groupId:'group-1', invitedUserId:'target-1', invitedUsername:'jordan', invitedDisplayName:'Jordan', createdAt:'2026-08-19T20:00:00Z' };

function props(group: GroupSummary) {
  return {
    busyAction:null, error:'', group, groups:[group], invites:group.role==='MEMBER'?[]:[invite], pendingInvites:[], members,
    onCreateInvite:vi.fn(async (_recipient:string)=>undefined), onAcceptInvite:vi.fn(async (_id:string)=>undefined), onDeclineInvite:vi.fn(async (_id:string)=>undefined),
    onLeaveGroup:vi.fn(async()=>undefined), onNavigate:vi.fn(), onRemoveMember:vi.fn(async()=>undefined), onRename:vi.fn(async()=>undefined),
    onRevokeInvite:vi.fn(async()=>undefined), onSelectGroup:vi.fn(), onSetMemberRole:vi.fn(async()=>undefined), onSignOut:vi.fn(), onTransferOwnership:vi.fn(async()=>undefined), profile,
  };
}

describe('GroupAdministrationScreen', () => {
  it('shows owner-only role controls and targeted invite administration without decorative filler', () => {
    render(<GroupAdministrationScreen {...props(ownerGroup)} />);
    expect(screen.getByRole('heading',{name:'Members'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Invites'})).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Username or invite ID'})).toBeInTheDocument();
    expect(screen.getByText(/FG-1A2B3C4D5E/)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Make admin'})).toBeInTheDocument();
    expect(screen.getAllByRole('button',{name:'Transfer ownership'})).toHaveLength(2);
    expect(screen.getByRole('button',{name:'Save name'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Leave group'})).not.toBeInTheDocument();
  });

  it('sends a targeted invitation and never exposes a reusable copy-code action', async () => {
    const user=userEvent.setup(); const p=props(ownerGroup);
    render(<GroupAdministrationScreen {...p} />);
    await user.type(screen.getByRole('textbox',{name:'Username or invite ID'}),'@alex');
    await user.click(screen.getByRole('button',{name:'Send invite'}));
    expect(p.onCreateInvite).toHaveBeenCalledWith('@alex');
    expect(screen.queryByText(/copy code/i)).not.toBeInTheDocument();
  });

  it('keeps ordinary members read-only except for their invite ID, incoming invites, and leaving', () => {
    const memberProps={...props({...ownerGroup,role:'MEMBER'}),pendingInvites:[{id:'incoming-1',groupId:'group-2',groupName:'Night Crew',invitedByUserId:'other',invitedByUsername:'jordan',invitedByDisplayName:'Jordan',createdAt:'x'}]};
    render(<GroupAdministrationScreen {...memberProps} />);
    expect(screen.getByText(/FG-1A2B3C4D5E/)).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Pending invitations'})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Invites'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Make admin'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Save name'})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Leave group'})).toBeInTheDocument();
  });
});
