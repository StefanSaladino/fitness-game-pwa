import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OnboardingProfile } from '../../src/features/onboarding';
import type { GroupMember, GroupSummary, ManagedGroupInvite, PendingGroupInvite } from '../../src/features/groups';
import type { GroupChatMessage, GroupChatService } from '../../src/features/groups/chat';
import { GroupAdministrationScreen } from '../../src/features/groups';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', profileCode: 'FG-1111111111', preferredWeightUnit: 'KG',
};

const groups: GroupSummary[] = [
  { id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' },
  { id: 'group-2', name: 'Weekend Crew', memberCount: 5, role: 'MEMBER', joinedAt: '2026-08-19T00:00:00Z', createdAt: '2026-08-19T00:00:00Z' },
];

const members: GroupMember[] = [
  { userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePicturePath: null, profilePictureUrl: null, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z' },
  { userId: 'user-2', username: 'alex', displayName: 'Alex', profilePicturePath: null, profilePictureUrl: null, role: 'ADMIN', joinedAt: '2026-08-18T01:00:00Z' },
  { userId: 'user-3', username: 'sam', displayName: 'Sam', profilePicturePath: null, profilePictureUrl: null, role: 'MEMBER', joinedAt: '2026-08-18T02:00:00Z' },
];

const outgoing: ManagedGroupInvite[] = [{
  id: 'invite-out', groupId: 'group-1', invitedUserId: 'user-4', invitedUsername: 'jordan', invitedDisplayName: 'Jordan', createdAt: '2026-08-20T00:00:00Z',
}];

const incoming: PendingGroupInvite[] = [{
  id: 'invite-in', groupId: 'group-3', groupName: 'Night Crew', invitedByUserId: 'user-5', invitedByUsername: 'taylor', invitedByDisplayName: 'Taylor', createdAt: '2026-08-21T00:00:00Z',
}];

let chatMessages: GroupChatMessage[] = [{
  id: 'chat-1', authorUserId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null,
  body: 'Morning lift tomorrow?', createdAt: '2026-08-27T15:00:00Z', deletedAt: null, canDelete: true,
  reactions: { FIRE: 1, STRONG: 0, CLAP: 0, HEART: 0, LAUGH: 0 }, myReaction: null,
}];

const chatService: GroupChatService = {
  loadMessages: async () => ({ items: chatMessages.map((message) => ({ ...message, reactions: { ...message.reactions } })), nextCursor: null }),
  postMessage: async (_groupId, body) => {
    chatMessages = [{
      id: 'chat-2', authorUserId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
      body, createdAt: '2026-08-27T16:00:00Z', deletedAt: null, canDelete: true,
      reactions: { FIRE: 0, STRONG: 0, CLAP: 0, HEART: 0, LAUGH: 0 }, myReaction: null,
    }, ...chatMessages];
    return 'chat-2';
  },
  setReaction: async (_groupId, messageId, reaction) => {
    chatMessages = chatMessages.map((message) => message.id === messageId ? {
      ...message,
      myReaction: reaction,
      reactions: { ...message.reactions, HEART: reaction === 'HEART' ? 1 : 0 },
    } : message);
  },
  deleteMessage: async (_groupId, messageId) => {
    chatMessages = chatMessages.map((message) => message.id === messageId ? { ...message, body: null, deletedAt: '2026-08-27T16:01:00Z', canDelete: false } : message);
  },
  subscribe: () => () => undefined,
};

function Harness() {
  const [selectedId, setSelectedId] = useState(groups[0]!.id);
  const selected = groups.find((group) => group.id === selectedId) ?? groups[0]!;
  return (
    <GroupAdministrationScreen
      busyAction={null}
      chatService={chatService}
      createGroupError=""
      creatingGroup={false}
      error=""
      group={selected}
      groups={groups}
      invites={selected.role === 'OWNER' ? outgoing : []}
      members={members}
      onAcceptInvite={() => undefined}
      onCreateGroup={() => undefined}
      onCreateInvite={() => undefined}
      onDeclineInvite={() => undefined}
      onLeaveGroup={() => undefined}
      onNavigate={() => undefined}
      onRemoveMember={() => undefined}
      onRename={() => undefined}
      onRevokeInvite={() => undefined}
      onSelectGroup={setSelectedId}
      onSetMemberRole={() => undefined}
      onSignOut={() => undefined}
      onTransferOwnership={() => undefined}
      pendingInvites={incoming}
      profile={profile}
    />
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
