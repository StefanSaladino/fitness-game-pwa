import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ModerationActivityType, ModerationCaseDirectoryPage, ModerationCaseRecord } from '../model';
import { ModerationWorkspaceScreen } from './ModerationWorkspaceScreen';

const createdAt = '2026-08-23T12:00:00.000Z';
const party = { userId: 'target-id', username: 'target', displayName: 'Target User' };
const directory: ModerationCaseDirectoryPage = {
  page: 1, pageSize: 25, total: 1,
  items: [{
    caseId: 'case-id', reportId: 'report-id', status: 'NEW', category: 'HARASSMENT',
    reasonExcerpt: 'Repeated unwanted contact.', reporter: { userId: 'reporter-id', username: 'reporter', displayName: 'Reporter' },
    target: party, referenceType: 'GROUP', referenceLabel: 'Training Friends', assignedTo: null,
    createdAt, updatedAt: createdAt, closedAt: null,
  }],
};
const record: ModerationCaseRecord = {
  detail: {
    ...directory.items[0], reason: 'Repeated unwanted contact in the training group.', referenceGroupId: 'group-id',
    referenceId: null, assignedAt: null, resolutionReason: null, retentionUntil: null,
  },
  notes: [],
  events: [{
    eventId: 'event-id', actor: directory.items[0].reporter, action: 'REPORT_SUBMITTED', reason: null,
    beforeState: {}, afterState: { status: 'NEW' }, createdAt,
  }],
};

function props(overrides: Record<string, unknown> = {}) {
  return {
    currentUserId: 'admin-id', directory, directoryLoading: false, directoryError: '', status: null, page: 1,
    selectedCaseId: 'case-id', record, detailLoading: false, detailError: '', notice: '', actionBusy: false,
    actionError: '', directReview: false, reviewSubjectId: 'target-id',
    activityTypes: ['ACCOUNT', 'WORKOUT', 'GROUP_MEMBERSHIP', 'GROUP_ACTIVITY', 'REPORT'] as ModerationActivityType[],
    activityAccess: null, activity: null, activityLoading: false, activityError: '',
    onChangeStatus: vi.fn(), onChangePage: vi.fn(), onOpenCase: vi.fn(), onClearSelection: vi.fn(),
    onRetryDirectory: vi.fn(), onRetryDetail: vi.fn(), onAssignSelf: vi.fn().mockResolvedValue(true),
    onAddNote: vi.fn().mockResolvedValue(true), onUpdateStatus: vi.fn().mockResolvedValue(true),
    onBeginActivityReview: vi.fn().mockResolvedValue(true), onLoadMoreActivity: vi.fn(),
    ...overrides,
  };
}

describe('ModerationWorkspaceScreen', () => {
  it('shows confidential case context and requires an audited purpose before activity access', async () => {
    const user = userEvent.setup();
    const onBeginActivityReview = vi.fn().mockResolvedValue(true);
    render(<ModerationWorkspaceScreen {...props({ onBeginActivityReview })} />);

    expect(screen.getByText('Repeated unwanted contact in the training group.')).toBeInTheDocument();
    expect(screen.getByText('Reporter · @reporter')).toBeInTheDocument();
    expect(screen.getByText(/Raw workout content, Auth\/session data, and unrelated users are excluded/)).toBeInTheDocument();
    const openButton = screen.getByRole('button', { name: 'Open audited review' });
    expect(openButton).toBeDisabled();
    await user.type(screen.getByLabelText('Reason for access'), 'Investigating the reported safety context');
    await user.click(openButton);

    expect(onBeginActivityReview).toHaveBeenCalledWith(
      'Investigating the reported safety context',
      ['ACCOUNT', 'WORKOUT', 'GROUP_MEMBERSHIP', 'GROUP_ACTIVITY', 'REPORT'],
    );
  });

  it('renders a directory-selected direct review without inventing a moderation case', () => {
    render(<ModerationWorkspaceScreen {...props({
      selectedCaseId: null, record: null, directReview: true, reviewSubjectId: 'directory-target-id',
    })} />);
    expect(screen.getByRole('heading', { name: 'Privacy-bounded activity' })).toBeInTheDocument();
    expect(screen.getAllByText('directory-target-id')).toHaveLength(2);
    expect(screen.queryByText('Report evidence')).not.toBeInTheDocument();
  });
});
