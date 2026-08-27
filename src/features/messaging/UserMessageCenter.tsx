import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlatformInboxMessage, PlatformInboxPage } from './model';
import { createPlatformMessageService, type PlatformMessageService } from './platformMessageService';
import styles from './UserMessageCenter.module.css';

interface Props { service?: PlatformMessageService }

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function typeLabel(message: PlatformInboxMessage): string {
  if (message.messageType === 'ACTION_REQUIRED') return 'Action required';
  if (message.messageType === 'ACCOUNT_STATUS') return 'Account status';
  return message.messageType[0] + message.messageType.slice(1).toLowerCase();
}

export function UserMessageCenter({ service }: Props) {
  const api = useMemo(() => service ?? createPlatformMessageService(), [service]);
  const [inbox, setInbox] = useState<PlatformInboxPage | null>(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [triggerSlot, setTriggerSlot] = useState<HTMLElement | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PlatformInboxMessage | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const resolveSlot = () => {
      const settingsSlot = document.querySelector<HTMLElement>('[data-app-message-slot="settings"]');
      const desktopSlot = document.querySelector<HTMLElement>('[data-app-message-slot="desktop"]');
      const mobileSlot = document.querySelector<HTMLElement>('[data-app-message-slot="mobile"]');
      setTriggerSlot(settingsSlot ?? (media?.matches ? desktopSlot : mobileSlot) ?? mobileSlot ?? desktopSlot);
    };
    resolveSlot();
    const observer = new MutationObserver(resolveSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    media?.addEventListener?.('change', resolveSlot);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', resolveSlot);
    };
  }, []);

  async function load() {
    try { setInbox(await api.list()); setError(''); }
    catch { setError('Messages are temporarily unavailable.'); }
  }

  useEffect(() => { void load(); }, [api]);

  useEffect(() => {
    if (deleteCandidate) cancelDeleteRef.current?.focus();
  }, [deleteCandidate]);

  const popup = useMemo(() => inbox?.items.find((item) => (
    item.audienceType === 'ALL' && item.deliveryState === 'DELIVERED'
  )) ?? null, [inbox]);
  async function update(message: PlatformInboxMessage, acknowledge = false) {
    setBusyId(message.messageId);
    setError('');
    try {
      if (acknowledge) await api.acknowledge(message.messageId);
      else await api.markRead(message.messageId);
      await load();
    } catch { setError('The message could not be updated. Please try again.'); }
    finally { setBusyId(null); }
  }

  async function deleteMessage() {
    if (!deleteCandidate) return;
    setBusyId(deleteCandidate.messageId);
    setError('');
    try {
      await api.deleteMessage(deleteCandidate.messageId);
      setDeleteCandidate(null);
      await load();
    } catch { setError('The message could not be deleted. Please try again.'); }
    finally { setBusyId(null); }
  }

  const trigger = <button className={`${styles.trigger}${triggerSlot ? '' : ` ${styles.fallbackTrigger}`}`} data-system-notice-trigger onClick={() => setOpen(true)} type="button" aria-label={`Messages${inbox?.unreadCount ? `, ${inbox.unreadCount} unread` : ''}`}>
      <span aria-hidden="true">✉</span>{Boolean(inbox?.unreadCount) && <b>{inbox!.unreadCount}</b>}
    </button>;

  return <>
    {triggerSlot ? createPortal(trigger, triggerSlot) : trigger}

    {popup && <div className={styles.overlay} role="presentation">
      <section aria-describedby="whats-new-body" aria-labelledby="whats-new-title" aria-modal="true" className={styles.popup} data-system-sheet role="dialog">
        <p>WHAT’S NEW</p>
        <h2 id="whats-new-title">{popup.subject}</h2>
        <div id="whats-new-body">{popup.body}</div>
        {error && <span className={styles.error} role="alert">{error}</span>}
        <button disabled={busyId === popup.messageId} onClick={() => void update(popup)} type="button">
          {busyId === popup.messageId ? 'Dismissing…' : 'Got it'}
        </button>
      </section>
    </div>}

    {open && <div className={styles.overlay} role="presentation">
      <section aria-labelledby="message-center-title" aria-modal="true" className={styles.inbox} data-system-sheet role="dialog">
        <header><div><p>PLATFORM</p><h2 id="message-center-title">{deleteCandidate ? 'Delete message?' : 'Messages'}</h2></div><button aria-label={deleteCandidate ? 'Cancel message deletion' : 'Close messages'} onClick={() => deleteCandidate ? setDeleteCandidate(null) : setOpen(false)} type="button">×</button></header>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {deleteCandidate ? <div className={styles.deleteConfirmation}>
          <div><strong>{deleteCandidate.subject}</strong><p>This removes the message from your inbox only. It cannot be restored.</p></div>
          <div className={styles.deleteActions}>
            <button disabled={busyId !== null} onClick={() => setDeleteCandidate(null)} ref={cancelDeleteRef} type="button">Keep message</button>
            <button className={styles.deleteButton} disabled={busyId !== null} onClick={() => void deleteMessage()} type="button">{busyId ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div> : <>
          {!inbox && !error && <p className={styles.empty}>Loading messages…</p>}
          {inbox?.items.length === 0 && <p className={styles.empty}>No messages yet.</p>}
          {inbox && inbox.items.length > 0 && <ol className={styles.list}>{inbox.items.map((message) => <li data-unread={message.deliveryState === 'DELIVERED'} key={message.messageId}>
            <div><span>{typeLabel(message)} · {formatDate(message.sentAt)}</span><strong>{message.subject}</strong><p>{message.body}</p>{message.editedAt && <small>Updated {formatDate(message.editedAt)}</small>}</div>
            <div className={styles.messageActions}>
              {message.deliveryState === 'DELIVERED' && !message.acknowledgementRequired && <button disabled={busyId === message.messageId} onClick={() => void update(message)} type="button">Mark read</button>}
              {message.deliveryState !== 'ACKNOWLEDGED' && message.acknowledgementRequired && <button disabled={busyId === message.messageId} onClick={() => void update(message, true)} type="button">Acknowledge</button>}
              {(!message.acknowledgementRequired || message.deliveryState === 'ACKNOWLEDGED') && <button className={styles.deleteTextButton} disabled={busyId === message.messageId} onClick={() => setDeleteCandidate(message)} type="button">Delete</button>}
            </div>
          </li>)}</ol>}
        </>}
      </section>
    </div>}
  </>;
}
