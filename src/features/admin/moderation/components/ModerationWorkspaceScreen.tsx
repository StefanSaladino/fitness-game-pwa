import { useState, type FormEvent } from 'react';
import type {
  ModerationActivityPage,
  ModerationActivityItem,
  ModerationActivityReviewAccess,
  ModerationActivityType,
  ModerationCaseDirectoryPage,
  ModerationCaseRecord,
  ModerationCaseStatus,
} from '../model';
import styles from './ModerationWorkspace.module.css';

interface Props {
  currentUserId: string;
  directory: ModerationCaseDirectoryPage | null;
  directoryLoading: boolean;
  directoryError: string;
  status: ModerationCaseStatus | null;
  page: number;
  selectedCaseId: string | null;
  record: ModerationCaseRecord | null;
  detailLoading: boolean;
  detailError: string;
  notice: string;
  actionBusy: boolean;
  actionError: string;
  directReview: boolean;
  reviewSubjectId: string | null;
  activityTypes: ModerationActivityType[];
  activityAccess: ModerationActivityReviewAccess | null;
  activity: ModerationActivityPage | null;
  activityLoading: boolean;
  activityError: string;
  onChangeStatus: (status: ModerationCaseStatus | null) => void;
  onChangePage: (page: number) => void;
  onOpenCase: (caseId: string) => void;
  onClearSelection: () => void;
  onRetryDirectory: () => void;
  onRetryDetail: () => void;
  onAssignSelf: (reason: string) => Promise<boolean>;
  onAddNote: (note: string) => Promise<boolean>;
  onUpdateStatus: (status: Exclude<ModerationCaseStatus, 'NEW'>, reason: string) => Promise<boolean>;
  onBeginActivityReview: (reason: string, types: ModerationActivityType[]) => Promise<boolean>;
  onLoadMoreActivity: () => void;
}

const statusOptions: Array<{ value: ModerationCaseStatus | null; label: string }> = [
  { value: null, label: 'All' }, { value: 'NEW', label: 'New' },
  { value: 'IN_REVIEW', label: 'In review' }, { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const activityLabels: Record<ModerationActivityType, string> = {
  ACCOUNT: 'Account lifecycle', WORKOUT: 'Workout summaries',
  GROUP_MEMBERSHIP: 'Group membership', GROUP_ACTIVITY: 'Group activity', REPORT: 'Reports',
  COMMUNICATION: 'Administrator messages',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function statusLabel(status: ModerationCaseStatus): string {
  return status === 'IN_REVIEW' ? 'In review' : status[0] + status.slice(1).toLowerCase();
}

function activityContext(item: ModerationActivityItem): string | null {
  const value = (key: string) => item.metadata[key];
  if (item.activityType === 'WORKOUT') {
    const duration = typeof value('durationSeconds') === 'number'
      ? `${Math.round((value('durationSeconds') as number) / 60)} min`
      : null;
    const date = typeof value('scoringDate') === 'string' ? value('scoringDate') as string : null;
    return [date, duration, value('needsReview') === true ? 'Flagged for review' : null].filter(Boolean).join(' · ') || null;
  }
  if (item.activityType === 'ACCOUNT') return typeof value('reason') === 'string' ? value('reason') as string : null;
  if (item.activityType === 'GROUP_ACTIVITY') return typeof value('reactionType') === 'string' ? `Reaction: ${(value('reactionType') as string).toLowerCase()}` : null;
  if (item.activityType === 'GROUP_MEMBERSHIP') return typeof value('role') === 'string' ? `Role: ${(value('role') as string).toLowerCase()}` : null;
  if (item.activityType === 'REPORT') return typeof value('referenceLabel') === 'string' ? value('referenceLabel') as string : null;
  if (item.activityType === 'COMMUNICATION') return typeof value('deliveryState') === 'string' ? `Delivery: ${(value('deliveryState') as string).toLowerCase()}` : null;
  return null;
}

function ActivityReview({ subjectId, availableTypes, access, activity, loading, error, onBegin, onLoadMore, onOpenCase }: {
  subjectId: string;
  availableTypes: ModerationActivityType[];
  access: ModerationActivityReviewAccess | null;
  activity: ModerationActivityPage | null;
  loading: boolean;
  error: string;
  onBegin: Props['onBeginActivityReview'];
  onLoadMore: () => void;
  onOpenCase: (caseId: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ModerationActivityType[]>(availableTypes);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length >= 3) await onBegin(reason.trim(), selectedTypes);
  }
  return (
    <section className={styles.activityReview} aria-labelledby="activity-review-heading">
      <div className={styles.sectionHeading}>
        <div><p>SENSITIVE REVIEW</p><h3 id="activity-review-heading">Activity timeline</h3></div>
        {access && <span>Access expires {formatDate(access.expiresAt)}</span>}
      </div>
      {!access && (
        <form className={styles.accessForm} onSubmit={(event) => void submit(event)}>
          <p>Access is read-only, purpose-limited, and audited. Raw workout content, Auth/session data, and unrelated users are excluded.</p>
          <code>{subjectId}</code>
          <label><span>Reason for access</span><textarea aria-label="Reason for access" maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} value={reason} /><small>3–500 characters. This reason is retained in the access audit.</small></label>
          <fieldset><legend>Sources needed for this review</legend><div className={styles.sourceGrid}>
            {availableTypes.map((type) => <label key={type}><input checked={selectedTypes.includes(type)} onChange={(event) => setSelectedTypes((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type))} type="checkbox" /><span>{activityLabels[type]}</span></label>)}
          </div></fieldset>
          <button disabled={loading || reason.trim().length < 3 || selectedTypes.length === 0} type="submit">{loading ? 'Opening review…' : 'Open audited review'}</button>
        </form>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {access && activity && <>
        <div className={styles.accessSummary}><strong>{access.target.displayName}</strong><span>@{access.target.username} · {access.accountStatus ?? 'Deleted account'}</span></div>
        {activity.items.length === 0 ? <p className={styles.empty}>No activity exists in the selected sources.</p> : <ol className={styles.timeline}>
          {activity.items.map((item) => <li key={item.activityKey}><span className={styles.timelineMarker} aria-hidden="true" /><div><p>{activityLabels[item.activityType]}</p><h4>{item.title}</h4><span>{item.detail}</span>{activityContext(item) && <small>{activityContext(item)}</small>}<time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>{item.sourceCaseId && <button onClick={() => onOpenCase(item.sourceCaseId!)} type="button">Open case</button>}</div></li>)}
        </ol>}
        {activity.nextCursor && <button className={styles.secondaryButton} disabled={loading} onClick={onLoadMore} type="button">{loading ? 'Loading…' : 'Load more activity'}</button>}
      </>}
    </section>
  );
}

function CaseActions({ record, currentUserId, busy, error, onAssignSelf, onAddNote, onUpdateStatus }: {
  record: ModerationCaseRecord;
  currentUserId: string;
  busy: boolean;
  error: string;
  onAssignSelf: Props['onAssignSelf'];
  onAddNote: Props['onAddNote'];
  onUpdateStatus: Props['onUpdateStatus'];
}) {
  const [assignmentReason, setAssignmentReason] = useState('');
  const [note, setNote] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const open = record.detail.status === 'NEW' || record.detail.status === 'IN_REVIEW';
  return <section className={styles.caseActions} aria-labelledby="case-actions-heading"><h3 id="case-actions-heading">Case actions</h3>
    {!open ? <p>This case is closed. Its evidence and history remain read-only.</p> : <div className={styles.actionGrid}>
      {record.detail.assignedTo !== currentUserId && <form onSubmit={(event) => { event.preventDefault(); void onAssignSelf(assignmentReason); }}><label><span>Assignment reason</span><input maxLength={500} onChange={(event) => setAssignmentReason(event.target.value)} value={assignmentReason} /></label><button disabled={busy || assignmentReason.trim().length < 3} type="submit">Assign to me</button></form>}
      <form onSubmit={async (event) => { event.preventDefault(); if (await onAddNote(note)) setNote(''); }}><label><span>Private moderator note</span><textarea maxLength={2000} onChange={(event) => setNote(event.target.value)} rows={3} value={note} /></label><button disabled={busy || note.trim().length < 3} type="submit">Add note</button></form>
      <form onSubmit={(event) => event.preventDefault()}><label><span>Status reason</span><textarea maxLength={500} onChange={(event) => setStatusReason(event.target.value)} rows={3} value={statusReason} /></label><div className={styles.statusActions}>
        {record.detail.status === 'NEW' && <button disabled={busy || statusReason.trim().length < 3} onClick={() => void onUpdateStatus('IN_REVIEW', statusReason)} type="button">Start review</button>}
        <button disabled={busy || statusReason.trim().length < 3} onClick={() => void onUpdateStatus('RESOLVED', statusReason)} type="button">Resolve</button>
        <button className={styles.dismissButton} disabled={busy || statusReason.trim().length < 3} onClick={() => void onUpdateStatus('DISMISSED', statusReason)} type="button">Dismiss</button>
      </div></form>
    </div>}{error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}

export function ModerationWorkspaceScreen(props: Props) {
  const totalPages = Math.max(1, Math.ceil((props.directory?.total ?? 0) / 25));
  const detail = props.record?.detail;
  return <main className={styles.main} data-admin-page="moderation">
    <header className={styles.pageHeader}><div><h1>Moderation</h1><p>Review reports, preserve private context, and record every action.</p></div><strong>{props.directory?.total ?? 0} cases</strong></header>
    {props.notice && <p className={styles.notice} role="status">{props.notice}</p>}
    <div className={styles.workspace} data-detail-open={Boolean(props.selectedCaseId || props.directReview)}>
      <section className={styles.queue} data-admin-surface="queue" aria-labelledby="moderation-queue-heading"><h2 id="moderation-queue-heading">Case queue</h2>
        <div className={styles.filters} aria-label="Moderation case status">{statusOptions.map((option) => <button aria-pressed={props.status === option.value} key={option.label} onClick={() => props.onChangeStatus(option.value)} type="button">{option.label}</button>)}</div>
        {props.directoryError && !props.directory && <div className={styles.state} role="alert"><p>{props.directoryError}</p><button onClick={props.onRetryDirectory} type="button">Try again</button></div>}
        {props.directoryLoading && !props.directory && <div className={styles.state} role="status">Loading cases…</div>}
        {props.directory && props.directory.items.length === 0 && <div className={styles.state}><strong>No cases in this view</strong></div>}
        {props.directory && props.directory.items.length > 0 && <ul className={styles.caseList} aria-busy={props.directoryLoading}>{props.directory.items.map((item) => <li key={item.caseId}><button aria-current={props.selectedCaseId === item.caseId ? 'true' : undefined} data-selected={props.selectedCaseId === item.caseId} onClick={() => props.onOpenCase(item.caseId)} type="button"><span><b>{item.target.displayName}</b><small>@{item.target.username}</small></span><strong data-status={item.status}>{statusLabel(item.status)}</strong><p>{item.reasonExcerpt}</p><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></button></li>)}</ul>}
        {props.directory && props.directory.total > 0 && <nav className={styles.pagination} aria-label="Moderation case pages"><button disabled={props.page <= 1 || props.directoryLoading} onClick={() => props.onChangePage(props.page - 1)} type="button">Previous</button><span>{props.page} / {totalPages}</span><button disabled={props.page >= totalPages || props.directoryLoading} onClick={() => props.onChangePage(props.page + 1)} type="button">Next</button></nav>}
      </section>
      <section className={styles.detail} data-admin-surface="detail" aria-label="Moderation case detail">
        {(props.selectedCaseId || props.directReview) && <button className={styles.mobileBack} onClick={props.onClearSelection} type="button">‹ Back to cases</button>}
        {!props.selectedCaseId && !props.directReview && <div className={styles.detailEmpty}><strong>Select a case</strong><p>Report evidence, private history, and audited activity review will appear here.</p></div>}
        {props.detailLoading && !props.record && <div className={styles.state} role="status">Loading case…</div>}
        {props.detailError && !props.record && <div className={styles.state} role="alert"><p>{props.detailError}</p><button onClick={props.onRetryDetail} type="button">Try again</button></div>}
        {props.directReview && props.reviewSubjectId && !props.selectedCaseId && <><header className={styles.detailHeader}><div><p>DIRECT ACCOUNT REVIEW</p><h2>Privacy-bounded activity</h2><code>{props.reviewSubjectId}</code></div></header><ActivityReview access={props.activityAccess} activity={props.activity} availableTypes={props.activityTypes} error={props.activityError} loading={props.activityLoading} onBegin={props.onBeginActivityReview} onLoadMore={props.onLoadMoreActivity} onOpenCase={props.onOpenCase} subjectId={props.reviewSubjectId} /></>}
        {detail && props.record && <><header className={styles.detailHeader}><div><p>{detail.category.replaceAll('_', ' ')}</p><h2>{detail.target.displayName}</h2><span>@{detail.target.username}</span></div><strong data-status={detail.status}>{statusLabel(detail.status)}</strong></header>
          <section className={styles.reportEvidence} aria-labelledby="report-evidence-heading"><h3 id="report-evidence-heading">Report evidence</h3><blockquote>{detail.reason}</blockquote><dl><div><dt>Reporter</dt><dd>{detail.reporter.displayName} · @{detail.reporter.username}</dd></div><div><dt>Reference</dt><dd>{detail.referenceLabel ?? 'No attached evidence reference'}</dd></div><div><dt>Submitted</dt><dd>{formatDate(detail.createdAt)}</dd></div><div><dt>Assigned</dt><dd>{detail.assignedTo ?? 'Unassigned'}</dd></div></dl></section>
          <CaseActions busy={props.actionBusy} currentUserId={props.currentUserId} error={props.actionError} onAddNote={props.onAddNote} onAssignSelf={props.onAssignSelf} onUpdateStatus={props.onUpdateStatus} record={props.record} />
          <ActivityReview access={props.activityAccess} activity={props.activity} availableTypes={props.activityTypes} error={props.activityError} loading={props.activityLoading} onBegin={props.onBeginActivityReview} onLoadMore={props.onLoadMoreActivity} onOpenCase={props.onOpenCase} subjectId={detail.target.userId} />
          <section className={styles.history} aria-labelledby="case-history-heading"><h3 id="case-history-heading">Private notes and history</h3>{props.record.notes.length > 0 && <ul>{props.record.notes.map((note) => <li key={note.noteId}><b>{note.author.displayName}</b><p>{note.body}</p><time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time></li>)}</ul>}<ol>{props.record.events.map((event) => <li key={event.eventId}><b>{event.action.replaceAll('_', ' ')}</b><span>{event.reason ?? event.actor.displayName}</span><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></li>)}</ol></section>
        </>}
      </section>
    </div>
  </main>;
}
