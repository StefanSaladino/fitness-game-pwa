import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupSummary } from '../model';
import type { GroupChatMessage, GroupChatPage } from './model';
import type { GroupChatService } from './groupChatService';
import { GroupChatPanel } from './GroupChatPanel';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', profileCode: 'FG-1A2B3C4D5E', preferredWeightUnit: 'KG',
};
const group: GroupSummary = { id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' };
const message: GroupChatMessage = {
  id: 'message-1', authorUserId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
  body: 'Great session today.', createdAt: new Date().toISOString(), deletedAt: null, canDelete: true,
  reactions: { FIRE: 0, STRONG: 0, CLAP: 0, HEART: 0, LAUGH: 0 }, myReaction: null,
};

function serviceFixture(): GroupChatService {
  let messages = [message];
  return {
    loadMessages: vi.fn(async (): Promise<GroupChatPage> => ({ items: messages.map((item) => ({ ...item, reactions: { ...item.reactions } })), nextCursor: null })),
    postMessage: vi.fn(async (_groupId, body) => {
      messages = [{ ...message, id: 'message-2', body, createdAt: new Date(Date.now() + 1000).toISOString() }, ...messages];
      return 'message-2';
    }),
    setReaction: vi.fn(async (_groupId, messageId, reaction) => {
      messages = messages.map((item) => item.id === messageId ? {
        ...item,
        myReaction: reaction,
        reactions: { ...item.reactions, FIRE: reaction === 'FIRE' ? 1 : 0 },
      } : item);
    }),
    deleteMessage: vi.fn(async (_groupId, messageId) => {
      messages = messages.map((item) => item.id === messageId ? { ...item, body: null, deletedAt: new Date().toISOString(), canDelete: false } : item);
    }),
    subscribe: vi.fn(() => () => undefined),
  };
}

describe('GroupChatPanel', () => {
  it('posts, reacts, and deletes an own message behind explicit confirmation', async () => {
    const user = userEvent.setup();
    const service = serviceFixture();
    render(<GroupChatPanel group={group} profile={profile} service={service} />);
    expect(await screen.findByRole('heading', { name: 'Talk with Iron Crew' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Message your group' }), 'Who is lifting tomorrow?');
    await user.click(screen.getByRole('button', { name: 'Post message' }));
    await waitFor(() => expect(screen.getByText('Who is lifting tomorrow?')).toBeInTheDocument());
    expect(service.postMessage).toHaveBeenCalledWith('group-1', 'Who is lifting tomorrow?');

    const firstMessage = screen.getAllByRole('listitem')[0];
    await user.click(within(firstMessage).getByRole('button', { name: 'fire reaction, 0' }));
    expect(service.setReaction).toHaveBeenCalledWith('group-1', 'message-2', 'FIRE');

    await user.click(within(firstMessage).getByRole('button', { name: 'Delete message from Stefan' }));
    const confirmation = within(firstMessage).getByRole('group', { name: 'Confirm group message deletion' });
    expect(within(confirmation).getByText('Delete your message?')).toBeInTheDocument();
    expect(service.deleteMessage).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(within(firstMessage).getByText('Message deleted')).toBeInTheDocument());
    expect(service.deleteMessage).toHaveBeenCalledWith('group-1', 'message-2');
  });
});
