import type { CapacityDashboardService } from '../capacityDashboardService';
import { useCapacityDashboard } from '../hooks/useCapacityDashboard';
import { CapacityDashboard } from './CapacityDashboard';
import styles from './CapacityDashboard.module.css';

interface CapacityDashboardControllerProps {
  service?: CapacityDashboardService;
  onBackToApp: () => void;
}

export function CapacityDashboardController({ service, onBackToApp }: CapacityDashboardControllerProps) {
  const dashboard = useCapacityDashboard(service);

  if (dashboard.state === 'loading' && !dashboard.snapshot) {
    return <div className={styles.shell}><div className={styles.state} role="status">Loading…</div></div>;
  }

  if (!dashboard.snapshot) {
    return (
      <div className={styles.shell}>
        <div className={styles.state}>
          <div>
            <p>Capacity telemetry is unavailable.</p>
            <button className={styles.secondaryButton} onClick={() => void dashboard.refresh()} type="button">Try again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CapacityDashboard
      capturing={dashboard.capturing}
      error={dashboard.error}
      onBackToApp={onBackToApp}
      onCaptureSnapshot={() => void dashboard.captureSnapshot()}
      onRefresh={() => void dashboard.refresh()}
      snapshot={dashboard.snapshot}
    />
  );
}
