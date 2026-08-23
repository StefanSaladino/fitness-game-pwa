import { useCallback, useEffect, useMemo, useState } from 'react';
import { createModerationCaseService, type ModerationCaseService } from '../moderationCaseService';
import {
  MODERATION_ACTIVITY_TYPES,
  type ModerationActivityPage,
  type ModerationActivityReviewAccess,
  type ModerationActivityType,
  type ModerationCaseDirectoryPage,
  type ModerationCaseRecord,
  type ModerationCaseStatus,
} from '../model';
import { ModerationWorkspaceScreen } from './ModerationWorkspaceScreen';

interface Props {
  currentUserId: string;
  initialTargetUserId?: string | null;
  service?: ModerationCaseService;
}

export function ModerationWorkspaceController({ currentUserId, initialTargetUserId = null, service }: Props) {
  const moderationService = useMemo(() => service ?? createModerationCaseService(), [service]);
  const [status, setStatus] = useState<ModerationCaseStatus | null>(null);
  const [page, setPage] = useState(1);
  const [directory, setDirectory] = useState<ModerationCaseDirectoryPage | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [record, setRecord] = useState<ModerationCaseRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewSubjectId, setReviewSubjectId] = useState<string | null>(initialTargetUserId);
  const [activityAccess, setActivityAccess] = useState<ModerationActivityReviewAccess | null>(null);
  const [activity, setActivity] = useState<ModerationActivityPage | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');

  const loadDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    setDirectoryError('');
    try {
      setDirectory(await moderationService.list({ status, page, pageSize: 25 }));
    } catch (caught) {
      setDirectoryError(caught instanceof Error ? caught.message : 'Unable to load moderation cases.');
    } finally {
      setDirectoryLoading(false);
    }
  }, [moderationService, page, status]);

  const loadCase = useCallback(async (caseId: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const next = await moderationService.get(caseId);
      setRecord(next);
      setReviewSubjectId(next.detail.target.userId);
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : 'Unable to load moderation case.');
      setRecord(null);
    } finally {
      setDetailLoading(false);
    }
  }, [moderationService]);

  useEffect(() => { void loadDirectory(); }, [loadDirectory]);
  useEffect(() => { if (selectedCaseId) void loadCase(selectedCaseId); }, [loadCase, selectedCaseId]);

  function selectCase(caseId: string) {
    setSelectedCaseId(caseId);
    setActivityAccess(null);
    setActivity(null);
    setActivityError('');
    setActionError('');
    setNotice('');
  }

  function clearSelection() {
    setSelectedCaseId(null);
    setRecord(null);
    setReviewSubjectId(initialTargetUserId);
    setActivityAccess(null);
    setActivity(null);
    setDetailError('');
  }

  async function refreshAfterAction(message: string) {
    if (selectedCaseId) await loadCase(selectedCaseId);
    await loadDirectory();
    setNotice(message);
  }

  async function runAction(action: () => Promise<void>, message: string): Promise<boolean> {
    setActionBusy(true);
    setActionError('');
    setNotice('');
    try {
      await action();
      await refreshAfterAction(message);
      return true;
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update this moderation case.');
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function beginActivityReview(reason: string, types: ModerationActivityType[]): Promise<boolean> {
    if (!reviewSubjectId) return false;
    setActivityLoading(true);
    setActivityError('');
    setActivity(null);
    try {
      const access = await moderationService.beginActivityReview({
        targetUserId: reviewSubjectId,
        accessReason: reason,
        caseId: selectedCaseId,
        activityTypes: types,
      });
      setActivityAccess(access);
      setActivity(await moderationService.listActivity(access.accessId));
      return true;
    } catch (caught) {
      setActivityError(caught instanceof Error ? caught.message : 'Unable to open activity review.');
      return false;
    } finally {
      setActivityLoading(false);
    }
  }

  async function loadMoreActivity() {
    if (!activityAccess || !activity?.nextCursor) return;
    setActivityLoading(true);
    setActivityError('');
    try {
      const next = await moderationService.listActivity(activityAccess.accessId, activity.nextCursor);
      setActivity({ items: [...activity.items, ...next.items], nextCursor: next.nextCursor });
    } catch (caught) {
      setActivityError(caught instanceof Error ? caught.message : 'Unable to load more activity.');
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <ModerationWorkspaceScreen
      actionBusy={actionBusy}
      actionError={actionError}
      activity={activity}
      activityAccess={activityAccess}
      activityError={activityError}
      activityLoading={activityLoading}
      activityTypes={[...MODERATION_ACTIVITY_TYPES]}
      currentUserId={currentUserId}
      detailError={detailError}
      detailLoading={detailLoading}
      directory={directory}
      directoryError={directoryError}
      directoryLoading={directoryLoading}
      directReview={Boolean(initialTargetUserId && !selectedCaseId)}
      notice={notice}
      onAddNote={(note) => runAction(() => moderationService.addNote(selectedCaseId!, note).then(() => undefined), 'Moderator note added.')}
      onAssignSelf={(reason) => runAction(() => moderationService.assign(selectedCaseId!, currentUserId, reason), 'Case assigned to you.')}
      onBeginActivityReview={beginActivityReview}
      onChangePage={setPage}
      onChangeStatus={(next) => { setPage(1); setStatus(next); }}
      onClearSelection={clearSelection}
      onLoadMoreActivity={() => void loadMoreActivity()}
      onOpenCase={selectCase}
      onRetryDetail={() => selectedCaseId && void loadCase(selectedCaseId)}
      onRetryDirectory={() => void loadDirectory()}
      onUpdateStatus={(next, reason) => runAction(
        () => moderationService.updateStatus(selectedCaseId!, next, reason),
        `Case moved to ${next.toLowerCase().replace('_', ' ')}.`,
      )}
      page={page}
      record={record}
      reviewSubjectId={reviewSubjectId}
      selectedCaseId={selectedCaseId}
      status={status}
    />
  );
}
