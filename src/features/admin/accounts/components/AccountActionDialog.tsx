import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import {
  deletionConfirmationFor,
  deletionConfirmationMatches,
  normalizeSuspensionReviewAt,
  validateAccountActionReason,
} from '../accountAdministrationValidation';
import type { PlatformAccountDetail } from '../model';
import styles from './UserAdministration.module.css';

export type AccountDialogAction =
  | 'SUSPEND'
  | 'RESTORE'
  | 'REQUEST_DELETION'
  | 'CANCEL_DELETION'
  | 'CONFIRM_DELETION';

export interface AccountActionPayload {
  reason?: string;
  reviewAt?: string | null;
  confirmation?: string;
}

interface AccountActionDialogProps {
  account: PlatformAccountDetail;
  action: AccountDialogAction;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (payload: AccountActionPayload) => Promise<boolean>;
}

const copy: Record<AccountDialogAction, { title: string; submit: string; description: string }> = {
  SUSPEND: {
    title: 'Suspend account',
    submit: 'Suspend account',
    description: 'Suspension blocks product access and coordinates the Auth ban through the secured server boundary.',
  },
  RESTORE: {
    title: 'Restore account',
    submit: 'Restore account',
    description: 'Access is restored only after the secured server boundary completes the Auth unban.',
  },
  REQUEST_DELETION: {
    title: 'Request account deletion',
    submit: 'Request deletion',
    description: 'This first step moves the account to deletion pending. It does not delete account data.',
  },
  CANCEL_DELETION: {
    title: 'Cancel deletion request',
    submit: 'Cancel deletion request',
    description: 'Cancellation restores the exact ACTIVE or SUSPENDED state held before deletion was requested.',
  },
  CONFIRM_DELETION: {
    title: 'Permanently delete account',
    submit: 'Delete permanently',
    description: 'This action cannot be undone. Profile-owned workouts, scoring, memberships, preferences, and profile pictures are deleted.',
  },
};

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
  ));
}

export function AccountActionDialog({
  account,
  action,
  busy,
  error,
  onCancel,
  onSubmit,
}: AccountActionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [reason, setReason] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [reviewError, setReviewError] = useState<string>();
  const [confirmationError, setConfirmationError] = useState<string>();
  const isConfirmation = action === 'CONFIRM_DELETION';
  const expectedConfirmation = deletionConfirmationFor(account.username);
  const actionCopy = copy[action];

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [busy, onCancel]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = focusableElements(dialogRef.current);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
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
    if (busy) return;
    setReasonError(undefined);
    setReviewError(undefined);
    setConfirmationError(undefined);

    if (isConfirmation) {
      if (!deletionConfirmationMatches(confirmation, account.username)) {
        setConfirmationError(`Type ${expectedConfirmation} exactly.`);
        return;
      }
      if (await onSubmit({ confirmation })) onCancel();
      return;
    }

    const nextReasonError = validateAccountActionReason(reason);
    if (nextReasonError) {
      setReasonError(nextReasonError);
      return;
    }

    let normalizedReviewAt: string | null = null;
    if (action === 'SUSPEND') {
      const normalized = normalizeSuspensionReviewAt(reviewAt);
      if (normalized.error) {
        setReviewError(normalized.error);
        return;
      }
      normalizedReviewAt = normalized.value;
    }

    if (await onSubmit({ reason: reason.trim(), reviewAt: normalizedReviewAt })) onCancel();
  }

  return (
    <div className={styles.dialogBackdrop}>
      <div
        aria-describedby="account-action-description"
        aria-labelledby="account-action-title"
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={trapFocus}
        ref={dialogRef}
        role="dialog"
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className={styles.dialogHeader}>
            <div>
              <p className={styles.dialogEyebrow}>@{account.username}</p>
              <h2 id="account-action-title">{actionCopy.title}</h2>
            </div>
            <button aria-label="Close dialog" className={styles.closeButton} disabled={busy} onClick={onCancel} type="button">×</button>
          </div>
          <p className={styles.dialogDescription} id="account-action-description">{actionCopy.description}</p>

          {isConfirmation ? (
            <>
              <div className={styles.dangerNotice}>
                <strong>This action is permanent.</strong>
                <p>If this user owns a group, transfer ownership before deleting the account. Groups are never transferred or deleted silently.</p>
              </div>
              <label className={styles.field}>
                <span id="confirmation-label">Type <strong>{expectedConfirmation}</strong> to confirm</span>
                <input
                  aria-describedby={confirmationError ? 'confirmation-error' : undefined}
                  aria-invalid={Boolean(confirmationError)}
                  aria-labelledby="confirmation-label"
                  autoComplete="off"
                  onChange={(event) => setConfirmation(event.target.value)}
                  ref={firstFieldRef as RefObject<HTMLInputElement>}
                  spellCheck={false}
                  value={confirmation}
                />
                {confirmationError && <small className={styles.fieldError} id="confirmation-error">{confirmationError}</small>}
              </label>
            </>
          ) : (
            <>
              <label className={styles.field}>
                <span id="reason-label">Audit reason</span>
                <textarea
                  aria-describedby={reasonError ? 'reason-error' : 'reason-hint'}
                  aria-invalid={Boolean(reasonError)}
                  aria-labelledby="reason-label"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  ref={firstFieldRef as RefObject<HTMLTextAreaElement>}
                  rows={4}
                  value={reason}
                />
                {reasonError
                  ? <small className={styles.fieldError} id="reason-error">{reasonError}</small>
                  : <small id="reason-hint">3–500 characters. This reason is recorded.</small>}
              </label>
              {action === 'SUSPEND' && (
                <label className={styles.field}>
                  <span id="review-label">Review date <small>Optional</small></span>
                  <input
                    aria-describedby={reviewError ? 'review-error' : 'review-hint'}
                    aria-invalid={Boolean(reviewError)}
                    aria-labelledby="review-label"
                    onChange={(event) => setReviewAt(event.target.value)}
                    type="datetime-local"
                    value={reviewAt}
                  />
                  {reviewError
                    ? <small className={styles.fieldError} id="review-error">{reviewError}</small>
                    : <small id="review-hint">Must be in the future.</small>}
                </label>
              )}
            </>
          )}

          {error && <p className={styles.dialogError} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button className={styles.secondaryButton} disabled={busy} onClick={onCancel} type="button">Cancel</button>
            <button
              className={isConfirmation || action === 'REQUEST_DELETION' ? styles.dangerButton : styles.primaryButton}
              disabled={busy || (isConfirmation && !deletionConfirmationMatches(confirmation, account.username))}
              type="submit"
            >
              {busy ? 'Working…' : actionCopy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
