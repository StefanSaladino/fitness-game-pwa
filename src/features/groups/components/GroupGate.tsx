import type { ReactNode } from 'react';
import { Button } from '../../../components/ui';
import type { GroupService } from '../groupService';
import { useGroups } from '../hooks/useGroups';
import type { GroupSummary } from '../model';
import styles from './GroupGate.module.css';

interface GroupGateProps {
  userId: string;
  children(groups: GroupSummary[], refreshGroups: () => Promise<GroupSummary[] | null>): ReactNode;
  service?: GroupService;
  profileCode?: string;
}

export function GroupGate({ userId, children, service }: GroupGateProps) {
  const groupState = useGroups(userId, service);

  if (groupState.status === 'loading') {
    return (
      <main className={styles.stateShell}>
        <p className={styles.kicker}>GROUPS</p>
        <p className={styles.stateMessage}>Loading your training crews…</p>
      </main>
    );
  }

  if (groupState.status === 'error') {
    return (
      <main className={styles.stateShell}>
        <section className={styles.errorCard}>
          <p className={styles.kicker}>GROUPS</p>
          <h1>We couldn’t load your groups.</h1>
          <p>{groupState.error || 'Try loading your groups again.'}</p>
          <Button onClick={() => void groupState.retry()}>Try again</Button>
        </section>
      </main>
    );
  }

  const groups = groupState.groups;
  if (groups.length === 0) {
    return <>{children(groups, groupState.retry)}</>;
  }

  return <>{children(groups, groupState.retry)}</>;
}
