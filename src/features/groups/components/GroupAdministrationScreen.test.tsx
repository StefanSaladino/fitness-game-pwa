import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupMember, GroupSummary, ManagedGroupInvite } from '../model';
import type { GroupChatService } from '../chat';
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
    creatingGroup:false, createGroupError:'', onCreateGroup:vi.fn(async()=>undefined),
    onCreateInvite:vi.fn(async (_recipient:string)=>undefined), onAcceptInvite:vi.fn(async (_id:string)=>undefined), onDeclineInvite:vi.fn(async (_id:string)=>undefined),
    onLeaveGroup:vi.fn(async()=>undefined), onNavigate:vi.fn(), onRemoveMember:vi.fn(async()=>undefined), onRename:vi.fn(async()=>undefined),
    onRevokeInvite:vi.fn(async()=>undefined), onSelectGroup:vi.fn(), onSetMemberRole:vi.fn(async()=>undefined), onSignOut:vi.fn(), onTransferOwnership:vi.fn(async()=>undefined), profile,
  };
}

describe('GroupAdministrationScreen', () => {
  it('exposes a dedicated member-only chat destination inside Groups', async () => {
    const user = userEvent.setup();
    const chatService: GroupChatService = {
      loadMessages: vi.fn(async () => ({ items: [], nextCursor: null })),
      postMessage: vi.fn(async () => 'message-1'),
      setReaction: vi.fn(async () => undefined),
      deleteMessage: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
    };
    render(<GroupAdministrationScreen {...props(ownerGroup)} chatService={chatService} />);
    await user.click(screen.getByRole('tab', { name: 'Chat' }));
    expect(await screen.findByRole('heading', { name: 'Talk with Iron Crew' })).toBeInTheDocument();
    expect(screen.getByText(/Only current members can read or post/i)).toBeInTheDocument();
  });

  it('keeps owner actions behind one focused Manage affordance', async () => {
    const user = userEvent.setup();
    render(<GroupAdministrationScreen {...props(ownerGroup)} />);

    expect(screen.getByRole('heading',{name:'Your crew'})).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Invites/ }));
    expect(screen.getByRole('heading',{name:'Invite someone'})).toBeInTheDocument();
    expect(screen.getByText(/FG-1A2B3C4D5E/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Make admin'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Transfer ownership'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Members/ }));
    await user.click(screen.getByRole('button', { name: 'Manage Alex' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button',{name:'Make member'})).toBeInTheDocument();
    expect(within(dialog).getByRole('button',{name:'Transfer ownership'})).toBeInTheDocument();
    expect(within(dialog).getByRole('button',{name:'Remove from group'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Leave group'})).not.toBeInTheDocument();
  });

  it('switches groups through the shared app-owned selector', async () => {
    const user = userEvent.setup();
    const second: GroupSummary = { ...ownerGroup, id:'group-2', name:'Sunday Crew', memberCount:5, role:'MEMBER' };
    const p = { ...props(ownerGroup), groups:[ownerGroup, second] };
    render(<GroupAdministrationScreen {...p} />);

    const selector = screen.getByRole('combobox', { name: 'Group' });
    expect(selector).toHaveTextContent(/Iron Crew/);
    await user.click(selector);
    await user.click(screen.getByRole('option', { name: /Sunday Crew/ }));
    expect(p.onSelectGroup).toHaveBeenCalledWith('group-2');
  });

  it('creates an additional group without replacing the current membership', async () => {
    const user = userEvent.setup();
    const p = props(ownerGroup);
    render(<GroupAdministrationScreen {...p} />);
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Sunday Crew');
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    expect(p.onCreateGroup).toHaveBeenCalledWith({ name: 'Sunday Crew' });
  });

  it('sends a targeted invitation and never exposes a reusable copy-code action', async () => {
    const user=userEvent.setup(); const p=props(ownerGroup);
    render(<GroupAdministrationScreen {...p} />);
    await user.click(screen.getByRole('tab', { name: /Invites/ }));
    await user.type(screen.getByRole('textbox',{name:'Username or invite ID'}),'@alex');
    await user.click(screen.getByRole('button',{name:'Send invite'}));
    expect(p.onCreateInvite).toHaveBeenCalledWith('@alex');
    expect(screen.queryByText(/copy code/i)).not.toBeInTheDocument();
  });

  it('keeps ordinary members read-only while preserving incoming invites, group creation, and leaving', async () => {
    const user = userEvent.setup();
    const memberGroup = {...ownerGroup, role:'MEMBER' as const};
    const memberProps={...props(memberGroup),pendingInvites:[{id:'incoming-1',groupId:'group-2',groupName:'Night Crew',invitedByUserId:'other',invitedByUsername:'jordan',invitedByDisplayName:'Jordan',createdAt:'x'}]};
    render(<GroupAdministrationScreen {...memberProps} />);

    await user.click(screen.getByRole('tab', { name: /Invites/ }));
    expect(screen.getByRole('heading',{name:'For you'})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Invite someone'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Manage /})).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByRole('button',{name:'Leave group'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Save name'})).not.toBeInTheDocument();
  });

  it('limits an admin to removing ordinary members from the focused sheet', async () => {
    const user = userEvent.setup();
    const adminGroup = { ...ownerGroup, role:'ADMIN' as const };
    render(<GroupAdministrationScreen {...props(adminGroup)} />);

    expect(screen.queryByRole('button', { name: 'Manage Alex' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Manage Sam' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Remove from group' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Make admin' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Transfer ownership' })).not.toBeInTheDocument();
  });

  it('requires explicit confirmation before removing a member', async () => {
    const user = userEvent.setup();
    const p = props(ownerGroup);
    render(<GroupAdministrationScreen {...p} />);

    await user.click(screen.getByRole('button', { name: 'Manage Sam' }));
    await user.click(screen.getByRole('button', { name: 'Remove from group' }));
    expect(screen.getByRole('heading', { name: 'Remove Sam from Iron Crew?' })).toBeInTheDocument();
    expect(p.onRemoveMember).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove Sam' }));
    expect(p.onRemoveMember).toHaveBeenCalledWith('member-1');
  });

  it('requires explicit confirmation before transferring ownership', async () => {
    const user = userEvent.setup();
    const p = props(ownerGroup);
    render(<GroupAdministrationScreen {...p} />);

    await user.click(screen.getByRole('button', { name: 'Manage Alex' }));
    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));
    expect(screen.getByRole('heading', { name: 'Transfer ownership to Alex?' })).toBeInTheDocument();
    expect(p.onTransferOwnership).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));
    expect(p.onTransferOwnership).toHaveBeenCalledWith('admin-1');
  });

  it('closes member management with Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<GroupAdministrationScreen {...props(ownerGroup)} />);
    const trigger = screen.getByRole('button', { name: 'Manage Alex' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
