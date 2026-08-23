import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PLATFORM_MESSAGE_TYPES, type PlatformMessageAudience, type PlatformMessageType } from '../../../messaging/model';
import type { PlatformMessageAudiencePreview, PlatformMessageGroupTarget, PlatformMessageHistoryPage, PlatformMessageUserTarget } from '../model';
import { createPlatformMessagingService, type PlatformMessagingService } from '../platformMessagingService';
import styles from './PlatformMessaging.module.css';

interface Props { service?: PlatformMessagingService; initialTargetUserId?: string | null }
type Target = PlatformMessageUserTarget | PlatformMessageGroupTarget;

function formatDate(value: string): string { return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function errorMessage(error: unknown): string { return error instanceof Error && error.message ? error.message : 'The operation could not be completed.'; }

export function PlatformMessagingController({ service, initialTargetUserId = null }: Props) {
  const api = useMemo(() => service ?? createPlatformMessagingService(), [service]);
  const [audience, setAudience] = useState<PlatformMessageAudience>(initialTargetUserId ? 'USER' : 'ALL');
  const [query, setQuery] = useState(initialTargetUserId ?? '');
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState<string | null>(initialTargetUserId);
  const [messageType, setMessageType] = useState<PlatformMessageType>('NOTICE');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [auditReason, setAuditReason] = useState('');
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [preview, setPreview] = useState<PlatformMessageAudiencePreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [history, setHistory] = useState<PlatformMessageHistoryPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  async function loadHistory() { try { setHistory(await api.list()); } catch (caught) { setError(errorMessage(caught)); } }
  useEffect(() => { void loadHistory(); }, [api]);
  useEffect(() => {
    if (!initialTargetUserId) return;
    void api.searchUsers(initialTargetUserId).then((rows) => { setTargets(rows); if (rows[0]) setTargetId(rows[0].userId); }).catch((caught) => setError(errorMessage(caught)));
  }, [api, initialTargetUserId]);
  useEffect(() => { setPreview(null); setConfirmation(''); }, [audience, targetId, messageType]);
  useEffect(() => { if (audience === 'ALL') { setMessageType('NOTICE'); setAcknowledgement(false); } }, [audience]);

  function changeAudience(next: PlatformMessageAudience) {
    setAudience(next); setQuery(''); setTargets([]); setTargetId(null); setError(''); setNotice('');
  }
  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { setTargets(audience === 'USER' ? await api.searchUsers(query) : await api.searchGroups(query)); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  async function buildPreview() {
    setBusy(true); setError(''); setNotice('');
    try { setPreview(await api.preview(audience, audience === 'ALL' ? null : targetId, audience === 'ALL' ? 'NOTICE' : messageType)); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (!preview) return; setBusy(true); setError('');
    try {
      await api.send({ previewId: preview.previewId, subject, body, acknowledgementRequired: audience === 'ALL' ? false : acknowledgement, expiresAt: expiry ? new Date(expiry).toISOString() : null, confirmation, auditReason });
      setNotice(`Message sent to ${preview.recipientCount} ${preview.recipientCount === 1 ? 'user' : 'users'}.`);
      setPreview(null); setConfirmation(''); setSubject(''); setBody(''); setAuditReason(''); setExpiry(''); setAcknowledgement(false);
      await loadHistory();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  async function editMessage(event: FormEvent, item: NonNullable<PlatformMessageHistoryPage>['items'][number]) {
    event.preventDefault(); setBusy(true); setError('');
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    try { await api.edit(item.messageId, String(values.get('subject')), String(values.get('body')), item.expiresAt, editReason); setEditingId(null); setEditReason(''); setNotice('Message revision published.'); await loadHistory(); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }
  async function withdraw(messageId: string) {
    setBusy(true); setError('');
    try { await api.withdraw(messageId, withdrawReason); setWithdrawingId(null); setWithdrawReason(''); setNotice('Message withdrawn.'); await loadHistory(); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }

  const selected = targets.find((item) => ('userId' in item ? item.userId : item.groupId) === targetId);
  return <main className={styles.main}>
    <header className={styles.header}><div><h1>Messages</h1><p>Send private, auditable notices to a user, group, or the full app.</p></div><strong>{history?.total ?? 0} sent</strong></header>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.grid}>
      <section className={styles.composer} aria-labelledby="composer-heading"><h2 id="composer-heading">Compose</h2>
        <fieldset className={styles.audience}><legend>Audience</legend>{(['USER','GROUP','ALL'] as const).map((item) => <label key={item}><input checked={audience === item} name="audience" onChange={() => changeAudience(item)} type="radio" /><span>{item === 'USER' ? 'Individual' : item === 'GROUP' ? 'Group' : 'Full app'}</span></label>)}</fieldset>
        {audience === 'ALL' ? <div className={styles.blastHelp}><strong>Shown as a “What’s new” popup</strong><p>Every active user sees this notice once. It is non-blocking, can be dismissed, and never requires acknowledgement.</p></div> : <form className={styles.search} onSubmit={(event) => void search(event)}><label><span>Find {audience === 'USER' ? 'user' : 'group'}</span><input onChange={(event) => setQuery(event.target.value)} placeholder={audience === 'USER' ? 'Username, name, or user ID' : 'Group name or ID'} value={query} /></label><button disabled={busy} type="submit">Search</button></form>}
        {audience !== 'ALL' && targets.length > 0 && <div className={styles.targets}>{targets.map((item) => {
          const id = 'userId' in item ? item.userId : item.groupId;
          const title = 'userId' in item ? `${item.displayName} · @${item.username}` : item.groupName;
          const detail = 'userId' in item ? item.accountStatus.replaceAll('_',' ') : `${item.eligibleRecipientCount} eligible users`;
          return <button aria-pressed={targetId === id} key={id} onClick={() => setTargetId(id)} type="button"><strong>{title}</strong><span>{detail}</span></button>;
        })}</div>}
        {selected && <p className={styles.selected}>Selected: <strong>{'userId' in selected ? `@${selected.username}` : selected.groupName}</strong></p>}
        <label><span>Message type</span><select disabled={audience === 'ALL'} onChange={(event) => setMessageType(event.target.value as PlatformMessageType)} value={audience === 'ALL' ? 'NOTICE' : messageType}>{PLATFORM_MESSAGE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></label>
        <label><span>Subject</span><input maxLength={120} minLength={3} onChange={(event) => setSubject(event.target.value)} value={subject} /></label>
        <label><span>Message</span><textarea maxLength={4000} minLength={10} onChange={(event) => setBody(event.target.value)} rows={6} value={body} /></label>
        <label><span>Audit reason</span><textarea aria-label="Audit reason" maxLength={500} minLength={3} onChange={(event) => setAuditReason(event.target.value)} rows={3} value={auditReason} /><small>Private. Retained with the administrator audit.</small></label>
        {messageType === 'NOTICE' && <label><span>Optional expiry</span><input onChange={(event) => setExpiry(event.target.value)} type="datetime-local" value={expiry} /></label>}
        {audience !== 'ALL' && <label className={styles.check}><input checked={acknowledgement} onChange={(event) => setAcknowledgement(event.target.checked)} type="checkbox" /><span>Require acknowledgement</span></label>}
        {!preview && <button className={styles.primary} disabled={busy || subject.trim().length < 3 || body.trim().length < 10 || auditReason.trim().length < 3 || (audience !== 'ALL' && !targetId)} onClick={() => void buildPreview()} type="button">Preview audience</button>}
        {preview && <form className={styles.confirm} onSubmit={(event) => void send(event)}><h3>Confirm delivery</h3><p><strong>{preview.recipientCount}</strong> {preview.recipientCount === 1 ? 'recipient' : 'recipients'} · {preview.audienceLabel}</p><label><span>Type <code>{preview.confirmationPhrase}</code></span><input aria-label="Exact send confirmation" autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} /></label><div><button onClick={() => setPreview(null)} type="button">Cancel</button><button className={styles.primary} disabled={busy || confirmation !== preview.confirmationPhrase} type="submit">{busy ? 'Sending…' : 'Send message'}</button></div></form>}
      </section>

      <section className={styles.history} aria-labelledby="history-heading"><div className={styles.sectionHeading}><h2 id="history-heading">Delivery history</h2><button onClick={() => void loadHistory()} type="button">Refresh</button></div>
        {!history && !error && <p>Loading message history…</p>}
        {history?.items.length === 0 && <p>No messages have been sent.</p>}
        {history && <ol>{history.items.map((item) => <li key={item.messageId} data-withdrawn={item.status === 'WITHDRAWN'}><header><div><span>{item.messageType.replaceAll('_',' ')} · {item.audienceLabel}</span><h3>{item.subject}</h3></div><strong>{item.status}</strong></header><p>{item.body}</p><dl><div><dt>Delivered</dt><dd>{item.recipientCount}</dd></div><div><dt>Read</dt><dd>{item.readCount}</dd></div>{item.acknowledgementRequired && <div><dt>Acknowledged</dt><dd>{item.acknowledgedCount}</dd></div>}<div><dt>Revision</dt><dd>{item.currentRevision}</dd></div></dl><time dateTime={item.sentAt}>{formatDate(item.sentAt)}</time>
          {item.status === 'SENT' && <div className={styles.historyActions}><button onClick={() => { setEditingId(editingId === item.messageId ? null : item.messageId); setEditReason(''); }} type="button">Edit</button><button onClick={() => { setWithdrawingId(withdrawingId === item.messageId ? null : item.messageId); setWithdrawReason(''); }} type="button">Withdraw</button></div>}
          {withdrawingId === item.messageId && <div className={styles.withdrawForm}><input aria-label={`Withdrawal reason for ${item.subject}`} onChange={(event) => setWithdrawReason(event.target.value)} placeholder="Withdrawal reason" value={withdrawReason} /><button disabled={busy || withdrawReason.trim().length < 3} onClick={() => void withdraw(item.messageId)} type="button">Confirm withdrawal</button></div>}
          {editingId === item.messageId && <form className={styles.editForm} onSubmit={(event) => void editMessage(event, item)}><label><span>Subject</span><input defaultValue={item.subject} maxLength={120} minLength={3} name="subject" /></label><label><span>Message</span><textarea defaultValue={item.body} maxLength={4000} minLength={10} name="body" rows={4} /></label><label><span>Edit reason</span><input onChange={(event) => setEditReason(event.target.value)} value={editReason} /></label><button disabled={busy || editReason.trim().length < 3} type="submit">Publish revision</button></form>}
        </li>)}</ol>}
      </section>
    </div>
  </main>;
}
