import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupService } from '../groupService';
import type { GroupSummary } from '../model';
import { GroupSetupController } from './GroupSetupController';

const group: GroupSummary = { id:'g1', name:'Iron Crew', memberCount:1, role:'OWNER', joinedAt:'x', createdAt:'x' };
function api(pending = true): GroupService {
  return {
    listGroups: vi.fn(async()=>[]), createGroup: vi.fn(async()=>group), getMembers: vi.fn(async()=>[]),
    createInvite: vi.fn() as GroupService['createInvite'], joinByInvite: vi.fn() as GroupService['joinByInvite'], listInvites: vi.fn(async()=>[]),
    listPendingInvites: vi.fn(async()=>pending ? [{ id:'i1', groupId:'g2', groupName:'Night Crew', invitedByUserId:'u2', invitedByUsername:'alex', invitedByDisplayName:'Alex', createdAt:'x' }] : []),
    acceptInvite: vi.fn(async()=> 'g2'), declineInvite: vi.fn(async()=>undefined), renameGroup:vi.fn(async()=>undefined), revokeInvite:vi.fn(async()=>undefined),
    setMemberRole:vi.fn(async()=>undefined), removeMember:vi.fn(async()=>undefined), transferOwnership:vi.fn(async()=>undefined), leaveGroup:vi.fn(async()=>undefined),
  };
}

describe('GroupSetupController', () => {
  it('refreshes membership after successful group creation', async () => {
    const user=userEvent.setup(); const service=api(false); const ready=vi.fn(async()=>undefined);
    render(<GroupSetupController userId="u1" service={service} onMembershipReady={ready}/>);
    await screen.findByRole('heading',{name:/build the crew/i});
    await user.type(screen.getByRole('textbox',{name:'Group name'}),'Iron Crew');
    await user.click(screen.getByRole('button',{name:'Create group'}));
    expect(service.createGroup).toHaveBeenCalledWith('u1',{name:'Iron Crew'});
    await waitFor(()=>expect(ready).toHaveBeenCalled());
  });

  it('accepts a pending targeted invitation and refreshes membership', async () => {
    const user=userEvent.setup(); const service=api(true); const ready=vi.fn(async()=>undefined);
    render(<GroupSetupController userId="u1" service={service} onMembershipReady={ready}/>);
    expect(await screen.findByText('Night Crew')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Accept'}));
    expect(service.acceptInvite).toHaveBeenCalledWith('i1');
    await waitFor(()=>expect(ready).toHaveBeenCalled());
  });

  it('lets a group-free user return to the dashboard without creating or joining', async () => {
    const user=userEvent.setup(); const back=vi.fn();
    render(<GroupSetupController userId="u1" service={api(false)} onMembershipReady={vi.fn()} onBackToDashboard={back}/>);
    await user.click(await screen.findByRole('button',{name:'Back to dashboard'}));
    expect(back).toHaveBeenCalledOnce();
  });
});
