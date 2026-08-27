import type { CapacityDashboardService } from '../capacityDashboardService';
import { AppStateSurface } from '../../../../components/feedback/AppStateSurface';
import { useCapacityDashboard } from '../hooks/useCapacityDashboard';
import { CapacityDashboard } from './CapacityDashboard';
import styles from './CapacityDashboard.module.css';

interface CapacityDashboardControllerProps {
  service?: CapacityDashboardService;
}

export function CapacityDashboardController({ service }: CapacityDashboardControllerProps) {
  const dashboard = useCapacityDashboard(service);

  if (dashboard.state === 'loading' && !dashboard.snapshot) {
    return <div className={styles.state}><AppStateSurface compact description="Reading project telemetry and provider availability." role="status" title="Loading capacity…" /></div>;
  }

  if (!dashboard.snapshot) {
    return (
      <div className={styles.state}>
        <AppStateSurface
          action={<button className={styles.secondaryButton} onClick={() => void dashboard.refresh()} type="button">Try again</button>}
          compact
          description="No operational readings were returned. Existing product data has not been changed."
          eyebrow="Unavailable"
          role="alert"
          title="Capacity telemetry is unavailable"
          tone="error"
        />
      </div>
    );
  }

  return (
    <CapacityDashboard
      capturing={dashboard.capturing}
      error={dashboard.error}
      onCaptureSnapshot={() => void dashboard.captureSnapshot()}
      onRefresh={() => void dashboard.refresh()}
      snapshot={dashboard.snapshot}
    />
  );
}
