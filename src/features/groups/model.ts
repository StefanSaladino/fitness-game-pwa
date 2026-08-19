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
  role: GroupRole;
  joinedAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  token: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
}

export interface CreateGroupInput {
  name: string;
}

export interface CreateInviteOptions {
  maxUses?: number;
  expiresAt?: string;
}

export interface GroupValidationIssue {
  field: 'name' | 'inviteToken' | 'maxUses' | 'expiresAt';
  message: string;
}
