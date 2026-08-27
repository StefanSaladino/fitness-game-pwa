export const GROUP_CHAT_REACTIONS = ['FIRE', 'STRONG', 'CLAP', 'HEART', 'LAUGH'] as const;

export type GroupChatReaction = (typeof GROUP_CHAT_REACTIONS)[number];

export interface GroupChatMessage {
  id: string;
  authorUserId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  body: string | null;
  createdAt: string;
  deletedAt: string | null;
  canDelete: boolean;
  reactions: Record<GroupChatReaction, number>;
  myReaction: GroupChatReaction | null;
}

export interface GroupChatCursor {
  createdAt: string;
  messageId: string;
}

export interface GroupChatPage {
  items: GroupChatMessage[];
  nextCursor: GroupChatCursor | null;
}
