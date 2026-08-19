import type { CreateGroupInput, CreateInviteOptions, GroupValidationIssue } from './model';

export const GROUP_NAME_MAX_LENGTH = 80;
export const INVITE_MAX_USES_MIN = 1;
export const INVITE_MAX_USES_MAX = 1000;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateCreateGroupInput(input: CreateGroupInput): {
  name: string;
  issues: GroupValidationIssue[];
} {
  const name = normalizeGroupName(input.name);
  const issues: GroupValidationIssue[] = [];

  if (name.length < 1 || name.length > GROUP_NAME_MAX_LENGTH) {
    issues.push({
      field: 'name',
      message: `Group name must be between 1 and ${GROUP_NAME_MAX_LENGTH} characters.`,
    });
  }

  return { name, issues };
}

export function assertValidCreateGroupInput(input: CreateGroupInput): string {
  const result = validateCreateGroupInput(input);
  if (result.issues.length > 0) throw new GroupValidationError(result.issues);
  return result.name;
}

export function normalizeInviteToken(value: string): string {
  const trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('invite') ?? url.searchParams.get('token');
    if (fromQuery && UUID_PATTERN.test(fromQuery)) return fromQuery.toLowerCase();

    const lastSegment = url.pathname.split('/').filter(Boolean).at(-1);
    if (lastSegment && UUID_PATTERN.test(lastSegment)) return lastSegment.toLowerCase();
  } catch {
    // Raw values are validated below.
  }

  return trimmed.toLowerCase();
}

export function validateInviteToken(value: string): {
  token: string;
  issues: GroupValidationIssue[];
} {
  const token = normalizeInviteToken(value);
  const issues: GroupValidationIssue[] = [];

  if (!UUID_PATTERN.test(token)) {
    issues.push({ field: 'inviteToken', message: 'Enter a valid group invite code or link.' });
  }

  return { token, issues };
}

export function assertValidInviteToken(value: string): string {
  const result = validateInviteToken(value);
  if (result.issues.length > 0) throw new GroupValidationError(result.issues);
  return result.token;
}

export function validateInviteOptions(options: CreateInviteOptions): GroupValidationIssue[] {
  const issues: GroupValidationIssue[] = [];

  if (
    options.maxUses !== undefined
    && (!Number.isInteger(options.maxUses)
      || options.maxUses < INVITE_MAX_USES_MIN
      || options.maxUses > INVITE_MAX_USES_MAX)
  ) {
    issues.push({
      field: 'maxUses',
      message: `Invite use limit must be a whole number from ${INVITE_MAX_USES_MIN} to ${INVITE_MAX_USES_MAX}.`,
    });
  }

  if (options.expiresAt !== undefined) {
    const expiresAt = Date.parse(options.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      issues.push({ field: 'expiresAt', message: 'Invite expiration must be in the future.' });
    }
  }

  return issues;
}

export function assertValidInviteOptions(options: CreateInviteOptions): void {
  const issues = validateInviteOptions(options);
  if (issues.length > 0) throw new GroupValidationError(issues);
}

export class GroupValidationError extends Error {
  constructor(public readonly issues: GroupValidationIssue[]) {
    super('Group input is invalid.');
    this.name = 'GroupValidationError';
  }
}
