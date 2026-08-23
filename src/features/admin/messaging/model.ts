import type { PlatformMessageAudience, PlatformMessageType } from '../../messaging/model';

export interface PlatformMessageUserTarget {
  userId: string;
  username: string;
  displayName: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';
}

export interface PlatformMessageGroupTarget {
  groupId: string;
  groupName: string;
  eligibleRecipientCount: number;
}

export interface PlatformMessageAudiencePreview {
  previewId: string;
  audienceType: PlatformMessageAudience;
  audienceLabel: string;
  recipientCount: number;
  confirmationPhrase: string;
  expiresAt: string;
}

export interface PlatformMessageSendInput {
  previewId: string;
  subject: string;
  body: string;
  acknowledgementRequired: boolean;
  expiresAt: string | null;
  confirmation: string;
  auditReason: string;
}

export interface PlatformMessageHistoryItem {
  messageId: string;
  audienceType: PlatformMessageAudience;
  audienceLabel: string;
  messageType: PlatformMessageType;
  subject: string;
  body: string;
  acknowledgementRequired: boolean;
  expiresAt: string | null;
  status: 'SENT' | 'WITHDRAWN';
  currentRevision: number;
  recipientCount: number;
  readCount: number;
  acknowledgedCount: number;
  sentAt: string;
  editedAt: string | null;
  withdrawnAt: string | null;
}

export interface PlatformMessageHistoryPage {
  items: PlatformMessageHistoryItem[];
  total: number;
}
