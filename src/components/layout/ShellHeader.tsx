import type { AppSection } from './navigation';
import { AppHeader } from './AppHeader';

interface ShellHeaderProps {
  userLabel: string;
  title?: string;
  backLabel?: string;
  onBack?: () => void;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

export function ShellHeader({ userLabel, title, backLabel, onBack, onNavigate, onSignOut }: ShellHeaderProps) {
  return (
    <AppHeader
      backLabel={backLabel}
      hideOnDesktop
      onBack={onBack}
      onOpenSettings={onNavigate ? () => onNavigate('profile') : undefined}
      onSignOut={onSignOut}
      title={title ?? 'Top Set'}
      userLabel={userLabel}
    />
  );
}
