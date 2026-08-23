export const USER_REPORT_CATEGORIES = [
  'HARASSMENT',
  'SPAM',
  'ABUSIVE_CONTENT',
  'IMPERSONATION',
  'CHEATING',
  'SAFETY',
  'OTHER',
] as const;

export type UserReportCategory = (typeof USER_REPORT_CATEGORIES)[number];
export type UserReportReferenceType = 'GROUP' | 'WORKOUT' | 'SOCIAL_ACTIVITY';

export type UserReportReference =
  | { type: 'GROUP'; groupId: string }
  | { type: 'WORKOUT'; groupId: string; workoutId: string }
  | { type: 'SOCIAL_ACTIVITY'; groupId: string; activityKey: string };

export interface SubmitUserReportInput {
  targetUserId: string;
  category: UserReportCategory;
  reason: string;
  reference?: UserReportReference | null;
}

export interface UserReportReceipt {
  caseId: string;
}
