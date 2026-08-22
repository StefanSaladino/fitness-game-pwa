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
  onBackToApp: () => void;
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

function ProviderRow({ name, scope, metrics }: { name: string; scope: string; metrics: CapacityDashboardSnapshot['supabase']['metrics'] }) {
  const availableCount = metrics.filter((metric) => metric.available && metric.value !== null).length;
  const state = availableCount > 0 ? `${availableCount} metrics available` : 'Billing usage unavailable';
  return (
    <div className={styles.providerRow}>
      <div className={styles.providerTop}>
        <strong>{name}</strong>
        <strong>{state}</strong>
      </div>
      <p>{scope}. Missing provider billing data stays unavailable; it is never reconstructed from local activity or reported as zero.</p>
    </div>
  );
}

export function CapacityDashboard({ snapshot, error, capturing, onBackToApp, onRefresh, onCaptureSnapshot }: CapacityDashboardProps) {
  const byCode = new Map(snapshot.current.map((metric) => [metric.code, metric]));
  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="Platform administration">
        <div className={styles.railBrand}>
          <strong>Workout Game</strong>
          <span>Platform administration</span>
        </div>
        <p className={styles.railLabel}>Operations</p>
        <div className={styles.railCurrent} aria-current="page">Capacity</div>
        <button className={styles.railButton} onClick={onBackToApp} type="button">Back to app</button>
      </aside>

      <div>
        <div className={styles.mobileBar}>
          <button className={styles.iconTextButton} onClick={onBackToApp} type="button">Back</button>
          <h1 className={styles.mobileTitle}>Capacity</h1>
          <span aria-hidden="true" />
        </div>

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1>Capacity</h1>
              <p>Operational capacity from the database and provider adapters. Missing limits and provider billing feeds are shown as unavailable or unconfigured.</p>
              <div className={styles.sourceLine}>Measured {formatMeasuredAt(snapshot.fetchedAt)}</div>
            </div>
            <div className={styles.actions}>
              <button className={styles.secondaryButton} onClick={onRefresh} type="button">Refresh</button>
              <button className={styles.primaryButton} disabled={capturing} onClick={onCaptureSnapshot} type="button">
                {capturing ? 'Recording…' : 'Record snapshot'}
              </button>
            </div>
          </header>

          {error && <div className={styles.message} role="status">{error}</div>}

          <section className={styles.section} aria-labelledby="capacity-current-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-current-heading">Current telemetry</h2>
              <span>Database-local · project scope</span>
            </div>
            <div className={styles.metrics}>
              {METRIC_ORDER.map(({ code, label }) => {
                const metric = byCode.get(code);
                return metric ? <MetricRow key={code} label={label} metric={metric} /> : null;
              })}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="capacity-history-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-history-heading">Snapshot history</h2>
              <span>Recorded manually</span>
            </div>
            <CapacityHistory snapshot={snapshot} />
          </section>

          <section className={styles.section} aria-labelledby="capacity-providers-heading">
            <div className={styles.sectionHeader}>
              <h2 id="capacity-providers-heading">Provider billing feeds</h2>
              <span>Fail closed</span>
            </div>
            <div className={styles.providerRows}>
              <ProviderRow name="Supabase" scope="Organization scope" metrics={snapshot.supabase.metrics} />
              <ProviderRow name="Netlify" scope="Account scope" metrics={snapshot.netlify.metrics} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
