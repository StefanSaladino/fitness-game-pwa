import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlatformAccountAdminService } from '../platformAccountAdminService';
import { createPlatformAccountAdminService } from '../platformAccountAdminService';
import type {
  PlatformAccountDetail,
  PlatformAccountDirectoryPage,
  PlatformAccountStatus,
} from '../model';

export type LoadState = 'loading' | 'ready' | 'error';
export type DetailState = 'idle' | 'loading' | 'ready' | 'error';

export interface UserAdministrationFilters {
  search: string;
  status: PlatformAccountStatus | null;
  page: number;
  pageSize: number;
}

const INITIAL_FILTERS: UserAdministrationFilters = {
  search: '',
  status: null,
  page: 1,
  pageSize: 25,
};

function actionFailureMessage(action: string): string {
  if (action === 'delete') {
    return 'The account could not be deleted. If the user owns a group, transfer ownership before retrying.';
  }
  return `The account could not be ${action}. Review its current state and try again.`;
}

export function useUserAdministration(injectedService?: PlatformAccountAdminService) {
  const serviceRef = useRef<PlatformAccountAdminService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createPlatformAccountAdminService();

  const directoryRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const actionBusyRef = useRef(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [directory, setDirectory] = useState<PlatformAccountDirectoryPage | null>(null);
  const [directoryState, setDirectoryState] = useState<LoadState>('loading');
  const [directoryError, setDirectoryError] = useState<string>();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformAccountDetail | null>(null);
  const [detailState, setDetailState] = useState<DetailState>('idle');
  const [detailError, setDetailError] = useState<string>();
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const loadDirectory = useCallback(async (nextFilters: UserAdministrationFilters) => {
    const requestId = ++directoryRequestRef.current;
    setDirectoryState('loading');
    setDirectoryError(undefined);
    try {
      const page = await serviceRef.current!.list({
        query: nextFilters.search,
        status: nextFilters.status ?? undefined,
        page: nextFilters.page,
        pageSize: nextFilters.pageSize,
      });
      if (requestId !== directoryRequestRef.current) return null;
      setDirectory(page);
      setDirectoryState('ready');
      return page;
    } catch {
      if (requestId !== directoryRequestRef.current) return null;
      setDirectoryError('The account directory could not be loaded.');
      setDirectoryState('error');
      return null;
    }
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    const requestId = ++detailRequestRef.current;
    setDetail(null);
    setDetailState('loading');
    setDetailError(undefined);
    try {
      const account = await serviceRef.current!.get(userId);
      if (requestId !== detailRequestRef.current) return null;
      setDetail(account);
      setDetailState('ready');
      return account;
    } catch {
      if (requestId !== detailRequestRef.current) return null;
      setDetail(null);
      setDetailError('The selected account could not be loaded.');
      setDetailState('error');
      return null;
    }
  }, []);

  useEffect(() => { void loadDirectory(filters); }, [filters, loadDirectory]);

  useEffect(() => {
    if (!selectedUserId) {
      detailRequestRef.current += 1;
      setDetail(null);
      setDetailError(undefined);
      setDetailState('idle');
      return;
    }
    void loadDetail(selectedUserId);
  }, [loadDetail, selectedUserId]);

  const applyFilters = useCallback((search: string, status: PlatformAccountStatus | null) => {
    setFilters((current) => ({ ...current, search: search.trim(), status, page: 1 }));
    setDetail(null);
    setSelectedUserId(null);
  }, []);

  const changePage = useCallback((page: number) => {
    setFilters((current) => ({ ...current, page: Math.max(1, page) }));
  }, []);

  const selectUser = useCallback((userId: string) => {
    setActionError(undefined);
    setNotice(undefined);
    setDetail(null);
    setDetailState('loading');
    setSelectedUserId(userId);
  }, []);

  const clearSelection = useCallback(() => setSelectedUserId(null), []);

  const runAction = useCallback(async (
    action: string,
    successMessage: string,
    operation: () => Promise<void>,
    deleted = false,
  ) => {
    if (actionBusyRef.current) return false;
    actionBusyRef.current = true;
    setActionBusy(true);
    setActionError(undefined);
    setNotice(undefined);
    try {
      await operation();
      setNotice(successMessage);
      if (deleted) {
        setSelectedUserId(null);
        const refreshed = await loadDirectory(filters);
        if (refreshed && refreshed.items.length === 0 && filters.page > 1) {
          setFilters((current) => ({ ...current, page: current.page - 1 }));
        }
      } else {
        await Promise.all([
          loadDirectory(filters),
          selectedUserId ? loadDetail(selectedUserId) : Promise.resolve(null),
        ]);
      }
      return true;
    } catch {
      setActionError(actionFailureMessage(action));
      return false;
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  }, [filters, loadDetail, loadDirectory, selectedUserId]);

  const selectedId = selectedUserId;

  return {
    filters,
    directory,
    directoryState,
    directoryError,
    detail,
    detailState,
    detailError,
    selectedUserId,
    actionBusy,
    actionError,
    notice,
    applyFilters,
    changePage,
    selectUser,
    clearSelection,
    clearActionError: () => setActionError(undefined),
    clearNotice: () => setNotice(undefined),
    retryDirectory: () => void loadDirectory(filters),
    retryDetail: () => { if (selectedId) void loadDetail(selectedId); },
    suspend: (reason: string, reviewAt: string | null) => runAction(
      'suspended',
      'Account suspended.',
      () => serviceRef.current!.suspend(selectedId!, reason, reviewAt),
    ),
    restore: (reason: string) => runAction(
      'restored',
      'Account restored.',
      () => serviceRef.current!.restore(selectedId!, reason),
    ),
    requestDeletion: (reason: string) => runAction(
      'updated',
      'Deletion requested. No account data has been deleted.',
      () => serviceRef.current!.requestDeletion(selectedId!, reason),
    ),
    cancelDeletion: (reason: string) => runAction(
      'updated',
      'Deletion request cancelled.',
      () => serviceRef.current!.cancelDeletion(selectedId!, reason),
    ),
    confirmDeletion: (confirmation: string) => runAction(
      'delete',
      'Account permanently deleted.',
      () => serviceRef.current!.confirmDeletion(selectedId!, confirmation),
      true,
    ),
  };
}
