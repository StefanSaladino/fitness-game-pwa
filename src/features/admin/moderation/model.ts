import type {
  UserReportCategory,
  UserReportReferenceType,
} from '../../moderation/model';

export const MODERATION_CASE_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'RESOLVED',
  'DISMISSED',
] as const;

export const MODERATION_CASE_ACTIONS = [
  'REPORT_SUBMITTED',
  'CASE_ASSIGNED',
  'CASE_UNASSIGNED',
  'NOTE_ADDED',
  'STATUS_CHANGED',
] as const;

export type ModerationCaseStatus = (typeof MODERATION_CASE_STATUSES)[number];
export type ModerationCaseAction = (typeof MODERATION_CASE_ACTIONS)[number];

export interface ModerationCaseParty {
  userId: string;
  username: string;
  displayName: string;
}

export interface ModerationCaseSummary {
  caseId: string;
  reportId: string;
  status: ModerationCaseStatus;
  category: UserReportCategory;
  reasonExcerpt: string;
  reporter: ModerationCaseParty;
  target: ModerationCaseParty;
  referenceType: UserReportReferenceType | null;
  referenceLabel: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface ModerationCaseDetail extends Omit<ModerationCaseSummary, 'reasonExcerpt'> {
  reason: string;
  referenceGroupId: string | null;
  referenceId: string | null;
  assignedAt: string | null;
  resolutionReason: string | null;
  retentionUntil: string | null;
}

export interface ModerationCaseNote {
  noteId: string;
  author: ModerationCaseParty;
  body: string;
  createdAt: string;
}

export interface ModerationCaseEvent {
  eventId: string;
  actor: ModerationCaseParty;
  action: ModerationCaseAction;
  reason: string | null;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
}

export interface ModerationCaseRecord {
  detail: ModerationCaseDetail;
  notes: ModerationCaseNote[];
  events: ModerationCaseEvent[];
}

export interface ModerationCaseDirectoryQuery {
  status?: ModerationCaseStatus | null;
  assignedTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ModerationCaseDirectoryPage {
  items: ModerationCaseSummary[];
  total: number;
  page: number;
  pageSize: number;
}
