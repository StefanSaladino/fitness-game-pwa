import { useRef, useState } from 'react';
import type { PlatformAccountAdminService } from '../platformAccountAdminService';
import { useUserAdministration } from '../hooks/useUserAdministration';
import {
  AccountActionDialog,
  type AccountActionPayload,
  type AccountDialogAction,
} from './AccountActionDialog';
import { UserAdministrationScreen } from './UserAdministrationScreen';

interface UserAdministrationControllerProps {
  currentUserId: string;
  service?: PlatformAccountAdminService;
}

export function UserAdministrationController({
  currentUserId,
  service,
}: UserAdministrationControllerProps) {
  const administration = useUserAdministration(service);
  const [dialogAction, setDialogAction] = useState<AccountDialogAction | null>(null);
  const dialogOpenerRef = useRef<HTMLElement | null>(null);

  function openDialog(action: AccountDialogAction) {
    dialogOpenerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    administration.clearActionError();
    setDialogAction(action);
  }

  function closeDialog() {
    administration.clearActionError();
    setDialogAction(null);
    window.setTimeout(() => dialogOpenerRef.current?.focus(), 0);
  }

  async function submitAction(payload: AccountActionPayload): Promise<boolean> {
    switch (dialogAction) {
      case 'SUSPEND':
        return administration.suspend(payload.reason!, payload.reviewAt ?? null);
      case 'RESTORE':
        return administration.restore(payload.reason!);
      case 'REQUEST_DELETION':
        return administration.requestDeletion(payload.reason!);
      case 'CANCEL_DELETION':
        return administration.cancelDeletion(payload.reason!);
      case 'CONFIRM_DELETION':
        return administration.confirmDeletion(payload.confirmation!);
      default:
        return false;
    }
  }

  return (
    <>
      <UserAdministrationScreen
        currentUserId={currentUserId}
        detail={administration.detail}
        detailError={administration.detailError}
        detailState={administration.detailState}
        directory={administration.directory}
        directoryError={administration.directoryError}
        directoryState={administration.directoryState}
        filters={administration.filters}
        notice={administration.notice}
        onApplyFilters={administration.applyFilters}
        onChangePage={administration.changePage}
        onClearSelection={administration.clearSelection}
        onOpenAction={openDialog}
        onRetryDetail={administration.retryDetail}
        onRetryDirectory={administration.retryDirectory}
        onSelectUser={administration.selectUser}
        selectedUserId={administration.selectedUserId}
      />
      {dialogAction && administration.detail && (
        <AccountActionDialog
          account={administration.detail}
          action={dialogAction}
          busy={administration.actionBusy}
          error={administration.actionError}
          onCancel={closeDialog}
          onSubmit={submitAction}
        />
      )}
    </>
  );
}
