export type PlatformAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';

export interface PlatformAccountSummary {
  userId: string;
  username: string;
  displayName: string;
  accountStatus: PlatformAccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
  isPlatformAdmin: boolean;
  suspensionReviewAt: string | null;
  deletionRequestedAt: string | null;
}

export interface PlatformAccountDetail extends PlatformAccountSummary {
  statusReason: string | null;
  statusUpdatedAt: string;
  deletionRequestedBy: string | null;
}

export interface PlatformAccountDirectoryPage {
  items: PlatformAccountSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlatformAccountDirectoryQuery {
  query?: string;
  status?: PlatformAccountStatus;
  page?: number;
  pageSize?: number;
}
