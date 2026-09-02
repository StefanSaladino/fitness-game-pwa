import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui';
import {
  BadgeCollection,
  createLiftingBadgeProgressService,
  type LiftingBadgeProgressService,
  type LiftingBadgeProgressSnapshot,
} from '../../consistency';
import styles from './PersonalBadgeCollectionPanel.module.css';

interface Props {
  service?: LiftingBadgeProgressService;
}

type BadgeState =
  | { status: 'loading'; snapshot: null; error: '' }
  | { status: 'ready'; snapshot: LiftingBadgeProgressSnapshot; error: '' }
  | { status: 'error'; snapshot: null; error: string };

export function PersonalBadgeCollectionPanel({ service }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BadgeState>({ status: 'loading', snapshot: null, error: '' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading', snapshot: null, error: '' });

    const badgeService = service ?? createLiftingBadgeProgressService();
    void badgeService.load().then((snapshot) => {
      if (!active) return;
      setState({ status: 'ready', snapshot, error: '' });
    }).catch(() => {
      if (!active) return;
      setState({
        status: 'error',
        snapshot: null,
        error: 'Your badge collection is temporarily unavailable.',
      });
    });

    return () => {
      active = false;
    };
  }, [attempt, service]);

  if (state.status === 'loading') {
    return <div className={styles.state} role="status">Loading your badges…</div>;
  }

  if (state.status === 'error') {
    return (
      <section className={styles.state}>
        <p role="alert">{state.error}</p>
        <Button onClick={() => setAttempt((value) => value + 1)} variant="secondary">Try again</Button>
      </section>
    );
  }

  return <BadgeCollection snapshot={state.snapshot} />;
}
