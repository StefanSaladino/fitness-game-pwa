import { useEffect, useRef, useState } from 'react';
import type {
  PlatformAccountDetail,
  PlatformAccountDirectoryPage,
  PlatformAccountStatus,
  PlatformAccountSummary,
} from '../model';
import type { DetailState, LoadState, UserAdministrationFilters } from '../hooks/useUserAdministration';
import styles from './UserAdministration.module.css';

interface UserAdministrationScreenProps {
  currentUserId: string;
  filters: UserAdministrationFilters;
  directory: PlatformAccountDirectoryPage | null;
  directoryState: LoadState;
  directoryError?: string;
  detail: PlatformAccountDetail | null;
  detailState: DetailState;
  detailError?: string;
  selectedUserId: string | null;
  notice?: string;
  onApplyFilters: (search: string, status: PlatformAccountStatus | null) => void;
  onChangePage: (page: number) => void;
  onSelectUser: (userId: string) => void;
  onClearSelection: () => void;
  onRetryDirectory: () => void;
  onRetryDetail: () => void;
  onOpenAction: (action: 'SUSPEND' | 'RESTORE' | 'REQUEST_DELETION' | 'CANCEL_DELETION' | 'CONFIRM_DELETION') => void;
  onOpenActivityReview?: (userId: string) => void;
}

const statuses: Array<{ value: PlatformAccountStatus | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DELETION_PENDING', label: 'Deletion pending' },
];

function formatDate(value: string | null, includeTime = false): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

function statusLabel(status: PlatformAccountStatus): string {
  if (status === 'DELETION_PENDING') return 'Deletion pending';
  return status === 'ACTIVE' ? 'Active' : 'Suspended';
}

function DirectoryRow({
  account,
  selected,
  onSelect,
}: {
  account: PlatformAccountSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={styles.directoryItem}>
      <button
        aria-current={selected ? 'true' : undefined}
        className={styles.directoryRow}
        data-selected={selected}
        onClick={onSelect}
        type="button"
      >
        <span className={styles.identityCell}>
          <strong>{account.displayName}</strong>
          <span>@{account.username}</span>
          {account.isPlatformAdmin && <small>Platform admin</small>}
        </span>
        <span className={styles.statusCell} data-status={account.accountStatus}>{statusLabel(account.accountStatus)}</span>
        <span className={styles.dateCell}><small>Joined</small>{formatDate(account.createdAt)}</span>
        <span className={styles.signInCell}><small>Last sign-in</small>{formatDate(account.lastSignInAt, true)}</span>
        <span className={styles.rowArrow} aria-hidden="true">›</span>
      </button>
    </li>
  );
}

function DetailRow({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className={styles.detailRow}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

function AccountControls({
  account,
  currentUserId,
  onOpenAction,
}: {
  account: PlatformAccountDetail;
  currentUserId: string;
  onOpenAction: UserAdministrationScreenProps['onOpenAction'];
}) {
  const isSelf = account.userId === currentUserId;
  if (isSelf) {
    return (
      <section className={styles.controls} aria-labelledby="account-controls-heading">
        <h3 id="account-controls-heading">Account controls</h3>
        <p>This is your current administrator account. Lifecycle actions are not offered here.</p>
      </section>
    );
  }

  return (
    <section className={styles.controls} aria-labelledby="account-controls-heading">
      <div className={styles.controlsHeader}>
        <h3 id="account-controls-heading">Account controls</h3>
        <span>All actions are audited</span>
      </div>
      <div className={styles.controlActions}>
        {account.accountStatus === 'ACTIVE' && (
          <button className={styles.primaryButton} onClick={() => onOpenAction('SUSPEND')} type="button">Suspend account</button>
        )}
        {account.accountStatus === 'SUSPENDED' && (
          <button className={styles.primaryButton} onClick={() => onOpenAction('RESTORE')} type="button">Restore account</button>
        )}
        {!account.isPlatformAdmin && account.accountStatus !== 'DELETION_PENDING' && (
          <button className={styles.dangerOutlineButton} onClick={() => onOpenAction('REQUEST_DELETION')} type="button">Request deletion</button>
        )}
        {!account.isPlatformAdmin && account.accountStatus === 'DELETION_PENDING' && (
          <>
            <button className={styles.secondaryButton} onClick={() => onOpenAction('CANCEL_DELETION')} type="button">Cancel deletion request</button>
            <button className={styles.dangerButton} onClick={() => onOpenAction('CONFIRM_DELETION')} type="button">Delete permanently</button>
          </>
        )}
      </div>
      {account.isPlatformAdmin && <p>Remove platform-administrator access before requesting deletion.</p>}
      {account.accountStatus === 'DELETION_PENDING' && !account.isPlatformAdmin && (
        <div className={styles.deletionWarning}>
          <strong>Irreversible deletion requires exact confirmation.</strong>
          <p>Group ownership must be transferred first. This screen never transfers or deletes a group automatically.</p>
        </div>
      )}
    </section>
  );
}

export function UserAdministrationScreen(props: UserAdministrationScreenProps) {
  const {
    currentUserId,
    filters,
    directory,
    directoryState,
    directoryError,
    detail,
    detailState,
    detailError,
    selectedUserId,
    notice,
    onApplyFilters,
    onChangePage,
    onSelectUser,
    onClearSelection,
    onRetryDirectory,
    onRetryDetail,
    onOpenAction,
    onOpenActivityReview,
  } = props;
  const [search, setSearch] = useState(filters.search);
  const directoryHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousSelectionRef = useRef<string | null>(null);
  const total = directory?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (directory?.pageSize ?? filters.pageSize)));

  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (previousSelectionRef.current && !selectedUserId && notice) directoryHeadingRef.current?.focus();
    previousSelectionRef.current = selectedUserId;
  }, [notice, selectedUserId]);

  return (
    <main className={styles.main}>
      <header className={styles.pageHeader}>
        <div>
          <h1 ref={directoryHeadingRef} tabIndex={-1}>Users</h1>
          <p>Manage account access and deletion through audited server boundaries.</p>
        </div>
        <strong>{total} {total === 1 ? 'account' : 'accounts'}</strong>
      </header>

      <p aria-live="polite" className={styles.liveNotice} role="status">{notice}</p>

      <div className={styles.workspace} data-detail-open={Boolean(selectedUserId)}>
        <section className={styles.directoryPane} aria-labelledby="user-directory-heading">
          <h2 className={styles.srOnly} id="user-directory-heading">Account directory</h2>
          <form
            className={styles.searchForm}
            onSubmit={(event) => {
              event.preventDefault();
              onApplyFilters(search, filters.status);
            }}
            role="search"
          >
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Search username, display name, or user ID</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search username, display name, or user ID"
                type="search"
                value={search}
              />
            </label>
            <button className={styles.secondaryButton} type="submit">Search</button>
          </form>

          <div className={styles.mobileFilters} aria-label="Account status filter">
            {statuses.map((status) => (
              <button
                aria-pressed={filters.status === status.value}
                key={status.label}
                onClick={() => onApplyFilters(search, status.value)}
                type="button"
              >
                {status.label}
              </button>
            ))}
          </div>
          <label className={styles.desktopFilter}>
            <span>Status</span>
            <select
              onChange={(event) => onApplyFilters(search, (event.target.value || null) as PlatformAccountStatus | null)}
              value={filters.status ?? ''}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETION_PENDING">Deletion pending</option>
            </select>
          </label>

          <div className={styles.directoryHeader} aria-hidden="true">
            <span>User</span><span>Status</span><span>Joined</span><span>Last sign-in</span>
          </div>

          {directoryError && !directory && (
            <div className={styles.stateBlock} role="alert">
              <p>{directoryError}</p>
              <button className={styles.secondaryButton} onClick={onRetryDirectory} type="button">Try again</button>
            </div>
          )}
          {directoryState === 'loading' && !directory && <div className={styles.stateBlock} role="status">Loading accounts…</div>}
          {directory && directory.items.length === 0 && directoryState !== 'loading' && (
            <div className={styles.stateBlock}>
              <strong>{filters.search ? 'No matching accounts' : 'No accounts in this status'}</strong>
              <p>Try another search or status filter.</p>
            </div>
          )}
          {directory && directory.items.length > 0 && (
            <ul aria-busy={directoryState === 'loading'} className={styles.directoryList}>
              {directory.items.map((account) => (
                <DirectoryRow
                  account={account}
                  key={account.userId}
                  onSelect={() => onSelectUser(account.userId)}
                  selected={selectedUserId === account.userId}
                />
              ))}
            </ul>
          )}
          {directoryState === 'loading' && directory && <p className={styles.updating} role="status">Updating accounts…</p>}
          {directoryError && directory && (
            <div className={styles.inlineError} role="alert">
              <span>{directoryError}</span>
              <button className={styles.secondaryButton} onClick={onRetryDirectory} type="button">Try again</button>
            </div>
          )}

          {directory && directory.total > 0 && (
            <nav className={styles.pagination} aria-label="Account directory pages">
              <button
                className={styles.secondaryButton}
                disabled={filters.page <= 1 || directoryState === 'loading'}
                onClick={() => onChangePage(filters.page - 1)}
                type="button"
              >
                Previous
              </button>
              <span>Page {filters.page} of {totalPages}</span>
              <button
                className={styles.secondaryButton}
                disabled={filters.page >= totalPages || directoryState === 'loading'}
                onClick={() => onChangePage(filters.page + 1)}
                type="button"
              >
                Next
              </button>
            </nav>
          )}
        </section>

        <section className={styles.detailPane} aria-labelledby="account-detail-heading">
          {!selectedUserId && (
            <div className={styles.detailEmpty}>
              <strong>Select an account</strong>
              <p>Account identity, lifecycle state, and available audited actions will appear here.</p>
            </div>
          )}
          {selectedUserId && (
            <button className={styles.mobileDetailBack} onClick={onClearSelection} type="button">‹ Back to users</button>
          )}
          {selectedUserId && detailState === 'loading' && !detail && <div className={styles.detailState} role="status">Loading account…</div>}
          {selectedUserId && detailError && !detail && (
            <div className={styles.detailState} role="alert">
              <p>{detailError}</p>
              <button className={styles.secondaryButton} onClick={onRetryDetail} type="button">Try again</button>
            </div>
          )}
          {detail && (
            <>
              <header className={styles.detailHeader}>
                <div>
                  <h2 id="account-detail-heading">{detail.displayName}</h2>
                  <p>@{detail.username}</p>
                </div>
                <strong data-status={detail.accountStatus}>{statusLabel(detail.accountStatus)}</strong>
              </header>
              <dl className={styles.detailRows}>
                <DetailRow code label="User ID" value={detail.userId} />
                <DetailRow label="Joined" value={formatDate(detail.createdAt, true)} />
                <DetailRow label="Last sign-in" value={formatDate(detail.lastSignInAt, true)} />
                <DetailRow label="Status updated" value={formatDate(detail.statusUpdatedAt, true)} />
                <DetailRow label="Status reason" value={detail.statusReason || 'Not available'} />
                <DetailRow label="Review date" value={formatDate(detail.suspensionReviewAt, true)} />
                <DetailRow label="Deletion requested" value={formatDate(detail.deletionRequestedAt, true)} />
                {detail.deletionRequestedBy && <DetailRow code label="Requested by" value={detail.deletionRequestedBy} />}
                {detail.isPlatformAdmin && <DetailRow label="Platform access" value="Platform administrator" />}
              </dl>
              {onOpenActivityReview && (
                <button
                  className={styles.secondaryButton}
                  onClick={() => onOpenActivityReview(detail.userId)}
                  type="button"
                >
                  Review activity
                </button>
              )}
              <AccountControls account={detail} currentUserId={currentUserId} onOpenAction={onOpenAction} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
