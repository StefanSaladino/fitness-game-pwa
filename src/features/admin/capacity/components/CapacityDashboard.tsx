import { estimateCapacityGrowth, latestComparableMeasurements } from '../capacityMath';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { capacityStatusLabel, formatCapacityValue, formatMeasuredAt, formatUtilization } from '../formatCapacity';
import type { CapacityMetricAssessment, CapacityMetricCode } from '../model';
import styles from './CapacityDashboard.module.css';

const MEASURED_METRICS: Array<{ code: CapacityMetricCode; label: string }> = [
  { code: 'database_bytes', label: 'Database size' },
  { code: 'postgres_connections', label: 'Postgres connections' },
  { code: 'storage_bytes', label: 'Current project storage' },
];

interface CapacityDashboardProps {
  snapshot: CapacityDashboardSnapshot;
  error?: string;
  capturing?: boolean;
  onRefresh: () => void;
  onCaptureSnapshot: () => void;
}

function metricSourceLabel(metric: CapacityMetricAssessment): string {
  return `Database-local · project scope · measured ${formatMeasuredAt(metric.measuredAt)}`;
}

function detailLabel(metric: CapacityMetricAssessment): string {
  if (metric.code === 'storage_bytes') {
    return 'Free plan includes 1 GB organization Storage; billing uses average GB-hours, so no billing percentage is shown here.';
  }

  return metric.limit === null
    ? 'No verified limit available'
    : `Limit ${formatCapacityValue({ unit: metric.unit, value: metric.limit })}`;
}

function MetricCard({ metric, label }: { metric: CapacityMetricAssessment; label: string }) {
  const utilization = formatUtilization(metric);

  return (
    <article className={styles.metricCard} data-capacity-metric={metric.code}>
      <div className={styles.metricCardHeader}>
        <h3>{label}</h3>
        <span className={styles.statusBadge} data-status={metric.status}>
          {capacityStatusLabel(metric.status)}
        </span>
      </div>

      <div className={styles.metricReading}>
        <strong>{formatCapacityValue(metric)}</strong>
        <span>{detailLabel(metric)}</span>
      </div>

      {utilization && (
        <div className={styles.utilization} aria-label={`${label} utilization ${utilization}`}>
          <div className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${Math.min(metric.utilizationPercent ?? 0, 100)}%` }} />
          </div>
          <strong>{utilization}</strong>
        </div>
      )}

      <div className={styles.metricMeta}>
        <span>{metricSourceLabel(metric)}</span>
      </div>

      {metric.note && <p className={styles.metricNote}>{metric.note}</p>}
    </article>
  );
}

function CapacityHistory({ snapshot }: { snapshot: CapacityDashboardSnapshot }) {
  const history = snapshot.history;
  if (history.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <strong>No snapshots yet</strong>
        <p>Record a snapshot to establish a database-growth baseline.</p>
      </div>
    );
  }

  if (history.length === 1) {
    return (
      <div className={styles.historySummary}>
        <strong>1 snapshot recorded</strong>
        <p>Latest snapshot: {formatMeasuredAt(history[0].capturedAt)}. Record another later to calculate database growth.</p>
      </div>
    );
  }

  const currentDatabase = snapshot.current.find((metric) => metric.code === 'database_bytes');
  let growthText = 'No positive database growth signal from the latest comparable snapshots.';
  if (currentDatabase) {
    const comparable = latestComparableMeasurements(history, currentDatabase);
    if (comparable.length === 2) {
      const growth = estimateCapacityGrowth(comparable[1], comparable[0]);
      if (growth) {
        growthText = `Database growth: ${formatCapacityValue({ unit: 'bytes', value: growth.unitsPerDay })} per day.`;
      }
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
                <span>Database-local snapshot</span>
              </div>
              <strong>{database ? formatCapacityValue(database) : 'Unavailable'}</strong>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function CapacityDashboard({ snapshot, error, capturing, onRefresh, onCaptureSnapshot }: CapacityDashboardProps) {
  const metrics = new Map(snapshot.current.map((metric) => [metric.code, metric] as const));

  return (
    <main className={styles.main} data-admin-page="capacity">
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Platform administration</p>
          <h1>Capacity overview</h1>
          <p>Only measurements Top Set can verify directly are shown. Billing-cycle values that cannot be measured authoritatively are intentionally omitted.</p>
          <div className={styles.sourceLine}>
            <strong>Supabase connected</strong>
            <span>Measured {formatMeasuredAt(snapshot.fetchedAt)}</span>
          </div>
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
          <div>
            <p className={styles.sectionEyebrow}>Measured now</p>
            <h2 id="capacity-current-heading">Supabase project capacity</h2>
          </div>
          <span>Live guarded RPC</span>
        </div>
        <div className={styles.metricGrid} aria-label="Measured Supabase project capacity">
          {MEASURED_METRICS.map(({ code, label }) => {
            const metric = metrics.get(code);
            return metric ? <MetricCard key={code} label={label} metric={metric} /> : null;
          })}
        </div>
      </section>

      <section className={styles.section} data-admin-surface="history" aria-labelledby="capacity-history-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Trend</p>
            <h2 id="capacity-history-heading">Snapshot history</h2>
          </div>
          <span>Recorded manually</span>
        </div>
        <CapacityHistory snapshot={snapshot} />
      </section>

      <section className={styles.section} data-admin-surface="coverage" aria-labelledby="capacity-coverage-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Coverage</p>
            <h2 id="capacity-coverage-heading">Intentionally omitted</h2>
          </div>
          <span>Checked in Supabase Usage</span>
        </div>
        <p className={styles.sectionIntro}>
          Monthly Active Users, cached and uncached egress, Edge Function invocations, Realtime messages, and Realtime peak connections are not displayed because Top Set cannot retrieve authoritative current billing-cycle usage for them through a documented provider API.
        </p>
      </section>
    </main>
  );
}
