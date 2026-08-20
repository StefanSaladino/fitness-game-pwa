export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
  role: GroupRole;
  joinedAt: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  profilePicturePath: string | null;
  profilePictureUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  invitedUserId: string;
  invitedUsername: string;
  invitedDisplayName: string;
  createdAt: string;
}

export type ManagedGroupInvite = GroupInvite;

export interface PendingGroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  invitedByUserId: string;
  invitedByUsername: string;
  invitedByDisplayName: string;
  createdAt: string;
}

export interface CreateGroupInput { name: string; }

/** Retained only for source compatibility; targeted invites no longer use these fields. */
export interface CreateInviteOptions { maxUses?: number; expiresAt?: string; }

export interface GroupValidationIssue {
  field: 'name' | 'inviteToken' | 'maxUses' | 'expiresAt';
  message: string;
}
