import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  USER_REPORT_CATEGORIES,
  type UserReportCategory,
  type UserReportReference,
} from '../model';
import { createUserReportService, type UserReportService } from '../userReportService';
import styles from './UserReportDialog.module.css';

interface UserReportDialogProps {
  target: { userId: string; username: string; displayName: string };
  reference: UserReportReference;
  service?: UserReportService;
  onCancel: () => void;
  onSubmitted: () => void;
}

const categoryLabels: Record<UserReportCategory, string> = {
  HARASSMENT: 'Harassment',
  SPAM: 'Spam',
  ABUSIVE_CONTENT: 'Abusive content',
  IMPERSONATION: 'Impersonation',
  CHEATING: 'Cheating',
  SAFETY: 'Safety concern',
  OTHER: 'Other',
};

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), select:not([disabled])',
  ));
}

export function UserReportDialog({
  target,
  reference,
  service = createUserReportService(),
  onCancel,
  onSubmitted,
}: UserReportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const [category, setCategory] = useState<UserReportCategory>('HARASSMENT');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { categoryRef.current?.focus(); }, []);
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [busy, onCancel]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const elements = focusableElements(dialogRef.current);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 2000) {
      setError('Describe what happened in 10–2,000 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await service.submit({
        targetUserId: target.userId,
        category,
        reason: normalizedReason,
        reference,
      });
      onSubmitted();
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit this report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <div
        aria-describedby="user-report-description"
        aria-labelledby="user-report-title"
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={trapFocus}
        ref={dialogRef}
        role="dialog"
      >
        <form onSubmit={(event) => void submit(event)}>
          <header>
            <div>
              <p>REPORT USER</p>
              <h2 id="user-report-title">Report {target.displayName}</h2>
              <span>@{target.username}</span>
            </div>
            <button aria-label="Close report dialog" disabled={busy} onClick={onCancel} type="button">×</button>
          </header>
          <p className={styles.description} id="user-report-description">
            Your report goes to the private moderation queue. The reported user cannot see your identity through this feature.
          </p>
          <label>
            <span>Category</span>
            <select
              disabled={busy}
              onChange={(event) => setCategory(event.target.value as UserReportCategory)}
              ref={categoryRef}
              value={category}
            >
              {USER_REPORT_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
            </select>
          </label>
          <label>
            <span>What happened?</span>
            <textarea
              aria-describedby="user-report-reason-hint"
              aria-label="What happened?"
              disabled={busy}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              rows={6}
              value={reason}
            />
            <small id="user-report-reason-hint">10–2,000 characters. Include only details relevant to this report.</small>
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <footer>
            <button disabled={busy} onClick={onCancel} type="button">Cancel</button>
            <button disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit report'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
