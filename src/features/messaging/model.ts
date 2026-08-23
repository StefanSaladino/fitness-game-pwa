export const PLATFORM_MESSAGE_TYPES = ['NOTICE', 'WARNING', 'ACTION_REQUIRED', 'ACCOUNT_STATUS'] as const;
export const PLATFORM_MESSAGE_AUDIENCES = ['USER', 'GROUP', 'ALL'] as const;

export type PlatformMessageType = (typeof PLATFORM_MESSAGE_TYPES)[number];
export type PlatformMessageAudience = (typeof PLATFORM_MESSAGE_AUDIENCES)[number];
export type PlatformMessageDeliveryState = 'DELIVERED' | 'READ' | 'ACKNOWLEDGED';

export interface PlatformInboxMessage {
  messageId: string;
  audienceType: PlatformMessageAudience;
  messageType: PlatformMessageType;
  subject: string;
  body: string;
  acknowledgementRequired: boolean;
  currentRevision: number;
  deliveryState: PlatformMessageDeliveryState;
  deliveredAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  sentAt: string;
  editedAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export interface PlatformInboxPage {
  items: PlatformInboxMessage[];
  unreadCount: number;
  total: number;
}
