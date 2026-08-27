import { estimateCapacityGrowth, latestComparableMeasurements } from '../capacityMath';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { capacityStatusLabel, formatCapacityLimit, formatCapacityValue, formatMeasuredAt, formatUtilization } from '../formatCapacity';
import type { CapacityMetricAssessment, CapacityMetricCode } from '../model';
import styles from './CapacityDashboard.module.css';

const METRIC_ORDER: Array<{ code: CapacityMetricCode; label: string }> = [
  { code: 'database_bytes', label: 'Database size' },
  { code: 'storage_bytes', label: 'Storage' },
  { code: 'storage_objects', label: 'Storage objects' },
  { code: 'postgres_connections', label: 'Postgres connections' },
  { code: 'auth_users_total', label: 'Auth users' },
  { code: 'auth_users_30d', label: 'Recent sign-ins (30d)' },
];

interface CapacityDashboardProps {
  snapshot: CapacityDashboardSnapshot;
  error?: string;
  capturing?: boolean;
  onRefresh: () => void;
  onCaptureSnapshot: () => void;
}

function MetricRow({ metric, label }: { metric: CapacityMetricAssessment; label: string }) {
  const utilization = formatUtilization(metric);
  return (
    <div className={styles.metric}>
      <div className={styles.metricName}>{label}</div>
      <div className={styles.metricValue}>{formatCapacityValue(metric)}</div>
      <div className={styles.metricDetail}>{formatCapacityLimit(metric)}</div>
      <div className={styles.metricStatus} data-status={metric.status}>{capacityStatusLabel(metric.status)}</div>
      {utilization && (
        <div className={styles.utilization} aria-label={`${label} utilization ${utilization}`}>
          <div className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${Math.min(metric.utilizationPercent ?? 0, 100)}%` }} />
          </div>
          <strong>{utilization}</strong>
        </div>
      )}
    </div>
  );
}

function CapacityHistory({ snapshot }: { snapshot: CapacityDashboardSnapshot }) {
  const history = snapshot.history;
  if (history.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <strong>No snapshots yet</strong>
        <p>Record a snapshot to start capacity history. Growth is not estimated until comparable snapshots exist.</p>
      </div>
    );
  }

  if (history.length === 1) {
    return (
      <div className={styles.historySummary}>
        <strong>1 snapshot recorded</strong>
        <p>Latest snapshot: {formatMeasuredAt(history[0].capturedAt)}. Record another later to calculate growth.</p>
      </div>
    );
  }

  const currentDatabase = snapshot.current.find((metric) => metric.code === 'database_bytes');
  let growthText = 'No positive database growth signal from the latest comparable snapshots.';
  if (currentDatabase) {
    const comparable = latestComparableMeasurements(history, currentDatabase);
    if (comparable.length === 2) {
      const growth = estimateCapacityGrowth(comparable[1], comparable[0]);
      if (growth) growthText = `Database growth: ${formatCapacityValue({ unit: 'bytes', value: growth.unitsPerDay })} per day.`;
    }
  }

  return (
    <>
      <div className={styles.historySummary}>
        <strong>{history.length} recent snapshots</strong>
        <p>{growthText}</p>
      </div>
      <div className={styles.historyRows} aria-label="Recent capacity snapshots">
        {history.slice(0, 5).map((item) => {
          const database = item.metrics.find((metric) => metric.code === 'database_bytes');
          return (
            <div className={styles.historyRow} key={item.capturedAt}>
              <div>
                <strong>{formatMeasuredAt(item.capturedAt)}</strong>
                <div className={styles.historyMeta}>Database-local snapshot</div>
              </div>
              <div className={styles.historyValue}>{database ? formatCapacityValue(database) : 'Unavailable'}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProviderRow({ name, scope, metrics, unavailableLabel }: { name: string; scope: string; metrics: CapacityDashboardSnapshot['supabase']['metrics']; unavailableLabel: string }) {
  const availableCount = metrics.filter((metric) => metric.available && metric.value !== null).length;
  const state = availableCount > 0 ? `${availableCount} metrics available` : unavailableLabel;
  return (
    <div className={styles.providerRow}>
      <div className={styles.providerTop}>
        <strong>{name}</strong>
        <strong>{state}</strong>
      </div>
      <p>{scope}. Missing provider data stays unavailable; it is never reconstructed from local activity or reported as zero.</p>
    </div>
  );
}

export function CapacityDashboard({ snapshot, error, capturing, onRefresh, onCaptureSnapshot }: CapacityDashboardProps) {
  const byCode = new Map(snapshot.current.map((metric) => [metric.code, metric]));
  return (
    <main className={styles.main} data-admin-page="capacity">
          <header className={styles.header}>
            <div>
              <h1>Platform overview</h1>
              <p>Live project telemetry from guarded Supabase RPCs, with provider adapters kept behind explicit server-side boundaries.</p>
              <div className={styles.sourceLine}><strong>Supabase connected</strong><span>Measured {formatMeasuredAt(snapshot.fetchedAt)}</span></div>
            </div>
            <div className={styles.actions}>
              <button className={styles.secondaryButton} onClick={onRefresh} type="button">Refresh</button>
              <button className={styles.primaryButton} disabled={capturing} onClick={onCaptureSnapshot} type="button">
                {capturing ? 'Recording…' : 'Record snapshot'}
              </button>
            </div>
          </header>

          {error && <div className={styles.message} role="status">{error}</div>}

          <section className={styles.section} data-admin-surface="telemetry" aria-labelledby="capacity-current-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-current-heading">Supabase project data</h2>
              <span>Live guarded RPC · project scope</span>
            </div>
            <div className={styles.metrics}>
              {METRIC_ORDER.map(({ code, label }) => {
                const metric = byCode.get(code);
                return metric ? <MetricRow key={code} label={label} metric={metric} /> : null;
              })}
            </div>
          </section>

          <section className={styles.section} data-admin-surface="history" aria-labelledby="capacity-history-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-history-heading">Snapshot history</h2>
              <span>Recorded manually</span>
            </div>
            <CapacityHistory snapshot={snapshot} />
          </section>

          <section className={styles.section} data-admin-surface="providers" aria-labelledby="capacity-providers-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-providers-heading">Provider integrations</h2>
              <span>Server-side · fail closed</span>
            </div>
            <div className={styles.providerRows}>
              <ProviderRow name="Supabase Management" scope="Organization scope" metrics={snapshot.supabase.metrics} unavailableLabel="Management usage unavailable" />
              <ProviderRow name="Netlify" scope="Account scope" metrics={snapshot.netlify.metrics} unavailableLabel="Setup deferred" />
            </div>
          </section>
    </main>
  );
}
