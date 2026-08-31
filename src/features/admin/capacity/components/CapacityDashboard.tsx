import { estimateCapacityGrowth, latestComparableMeasurements } from '../capacityMath';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { capacityStatusLabel, formatCapacityValue, formatMeasuredAt, formatUtilization } from '../formatCapacity';
import type { CapacityMetricAssessment, CapacityMetricCode, CapacityMetricMeasurement } from '../model';
import type { NetlifyApiCapability } from '../netlifyApiProvider';
import styles from './CapacityDashboard.module.css';

const LIVE_METRICS: Array<{
  code: CapacityMetricCode;
  label: string;
  description: string;
}> = [
  {
    code: 'database_bytes',
    label: 'Database size',
    description: 'Measured PostgreSQL database size against the Supabase Free 500 MB per-project allowance.',
  },
  {
    code: 'postgres_connections',
    label: 'Postgres connections',
    description: 'Live PostgreSQL connections against this project’s current max_connections setting.',
  },
  {
    code: 'storage_bytes',
    label: 'Project storage',
    description: 'Current object bytes in this project. Supabase Free includes 1 GB across the organization, so no project-only utilization percentage is inferred.',
  },
];

const NETLIFY_METRICS: Array<{
  code: CapacityMetricCode;
  label: string;
  description: string;
}> = [
  {
    code: 'netlify_bandwidth_bytes',
    label: 'Bandwidth',
    description: 'Current billing-period bandwidth is not exposed by a documented Netlify public usage API.',
  },
  {
    code: 'netlify_requests',
    label: 'Web requests',
    description: 'Current billing-period web-request usage is not exposed by a documented Netlify public usage API.',
  },
  {
    code: 'netlify_build_usage',
    label: 'Build / credit usage',
    description: 'Current billing-period credit usage is not exposed by a documented Netlify public usage API.',
  },
];

interface CapacityDashboardProps {
  snapshot: CapacityDashboardSnapshot;
  error?: string;
  capturing?: boolean;
  onRefresh: () => void;
  onCaptureSnapshot: () => void;
}

function MetricCard({
  metric,
  label,
  description,
}: {
  metric: CapacityMetricAssessment;
  label: string;
  description: string;
}) {
  const utilization = formatUtilization(metric);
  const measuredOnly = metric.limit === null;

  return (
    <article className={styles.metricCard} data-capacity-metric={metric.code}>
      <div className={styles.metricCardHeader}>
        <h3>{label}</h3>
        <span className={styles.statusBadge} data-status={measuredOnly ? 'MEASURED' : metric.status}>
          {measuredOnly ? 'Measured' : capacityStatusLabel(metric.status)}
        </span>
      </div>

      <div className={styles.metricReading}>
        <strong>{formatCapacityValue(metric)}</strong>
        <span>
          {metric.limit === null
            ? 'No project-level utilization calculated'
            : `Limit ${formatCapacityValue({ unit: metric.unit, value: metric.limit })}`}
        </span>
      </div>

      {utilization && (
        <div className={styles.utilization} aria-label={`${label} utilization ${utilization}`}>
          <div className={styles.track} aria-hidden="true">
            <span
              className={styles.fill}
              style={{ width: `${Math.min(metric.utilizationPercent ?? 0, 100)}%` }}
            />
          </div>
          <strong>{utilization}</strong>
        </div>
      )}

      <p className={styles.metricDescription}>{description}</p>
      <div className={styles.metricMeta}>
        Database-local · project scope · measured {formatMeasuredAt(metric.measuredAt)}
      </div>
    </article>
  );
}

function netlifyConnectionLabel(capability?: NetlifyApiCapability): string {
  if (!capability?.providerReachable) return 'Provider function unavailable';
  if (!capability.apiConfigured) return 'Provider secrets not configured';
  if (!capability.accountVerified) return 'Netlify account verification failed';
  if (!capability.siteConfigured) return 'Netlify project not configured';
  if (!capability.siteVerified) return 'Netlify project verification failed';
  return 'Account and project verified';
}

function UnavailableNetlifyMetric({
  metric,
  label,
  description,
  measuredAt,
}: {
  metric?: CapacityMetricMeasurement;
  label: string;
  description: string;
  measuredAt: string;
}) {
  return (
    <div className={styles.metricCard} data-netlify-metric={metric?.code ?? label}>
      <div className={styles.metricCardHeader}>
        <h3>{label}</h3>
        <span className={styles.statusBadge} data-status="UNAVAILABLE">Unavailable</span>
      </div>
      <div className={styles.metricReading}>
        <strong>Not exposed</strong>
        <span>No authoritative billing-period value available</span>
      </div>
      <p className={styles.metricDescription}>{description}</p>
      {metric?.note && <p className={styles.metricNote}>{metric.note}</p>}
      <div className={styles.metricMeta}>
        Netlify API · account scope · checked {formatMeasuredAt(metric?.measuredAt ?? measuredAt)}
      </div>
    </div>
  );
}

function CapacityHistory({ snapshot }: { snapshot: CapacityDashboardSnapshot }) {
  const history = snapshot.history;

  if (history.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <strong>No snapshots yet</strong>
        <p>Record a snapshot to establish a database growth baseline. Growth estimates begin after two comparable snapshots exist.</p>
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
        growthText = `Database growth: ${formatCapacityValue({
          unit: 'bytes',
          value: growth.unitsPerDay,
        })} per day.`;
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

export function CapacityDashboard({
  snapshot,
  error,
  capturing,
  onRefresh,
  onCaptureSnapshot,
}: CapacityDashboardProps) {
  const byCode = new Map(snapshot.current.map((metric) => [metric.code, metric]));
  const netlifyByCode = new Map(snapshot.netlify.metrics.map((metric) => [metric.code, metric]));
  const netlifyCapability = snapshot.netlify.capability;

  return (
    <main className={styles.main} data-admin-page="capacity">
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Platform administration</p>
          <h1>Capacity overview</h1>
          <p>Only trustworthy, directly measurable project signals are shown here. Provider billing metrics that cannot be measured authoritatively remain unavailable rather than estimated.</p>
          <div className={styles.sourceLine}>
            <strong>Supabase connected</strong>
            <span>Project telemetry measured {formatMeasuredAt(snapshot.fetchedAt)}</span>
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
            <p className={styles.sectionEyebrow}>Live project telemetry</p>
            <h2 id="capacity-current-heading">Measured capacity</h2>
          </div>
          <span>Guarded database RPC</span>
        </div>

        <div className={styles.metricGrid} aria-label="Measured capacity metrics">
          {LIVE_METRICS.map(({ code, label, description }) => {
            const metric = byCode.get(code);
            return metric
              ? <MetricCard key={code} description={description} label={label} metric={metric} />
              : null;
          })}
        </div>
      </section>

      <section className={styles.section} data-admin-surface="netlify" aria-labelledby="netlify-capacity-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Hosting provider</p>
            <h2 id="netlify-capacity-heading">Netlify account telemetry</h2>
          </div>
          <span>Admin-only Edge Function</span>
        </div>
        <p className={styles.sectionIntro}>
          Top Set verifies the configured Netlify account and project through a server-side provider. The Netlify access token never enters the browser. Account Usage Insights totals are intentionally not reconstructed from deploy or traffic estimates.
        </p>
        <div className={styles.providerGrid}>
          <div className={styles.providerCard} data-provider="netlify">
            <div>
              <h3>Netlify provider connection</h3>
              <span>Server-side credential boundary</span>
            </div>
            <strong>{netlifyConnectionLabel(netlifyCapability)}</strong>
            <p>Usage totals remain unavailable until Netlify exposes an authoritative public API for current billing-period bandwidth, requests, and credits.</p>
          </div>
        </div>
        <div className={styles.metricGrid} aria-label="Netlify capacity metrics">
          {NETLIFY_METRICS.map(({ code, label, description }) => (
            <UnavailableNetlifyMetric
              key={code}
              description={description}
              label={label}
              measuredAt={snapshot.netlify.fetchedAt}
              metric={netlifyByCode.get(code)}
            />
          ))}
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

      <aside className={styles.quotaNote} aria-label="Provider quota boundaries">
        <strong>Provider quota boundaries</strong>
        <p>
          Supabase organization-level MAU, egress, Realtime, and Storage billing-cycle usage and Netlify Account Usage Insights totals are not inferred here. Review each provider’s Usage or Billing surface for authoritative values that are not available through a supported API.
        </p>
      </aside>
    </main>
  );
}
