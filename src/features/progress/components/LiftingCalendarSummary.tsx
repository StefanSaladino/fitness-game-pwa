import { Button } from '../../../components/ui';
import type { LiftingCalendarAnalytics, LiftingCalendarDelta } from '../liftingCalendarAnalytics';
import type { ExerciseProgressStatus } from '../hooks/useExerciseProgress';
import type { LiftingCalendarSummary as LiftingCalendarSummaryRow } from '../model';
import { ExerciseTrendChart } from './ExerciseTrendChart';
import styles from './LiftingCalendarSummary.module.css';

interface LiftingCalendarSummaryProps {
  analytics: LiftingCalendarAnalytics;
  status: ExerciseProgressStatus;
  error: string;
  onRetry: () => void;
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-CA', { maximumFractionDigits: digits });
}

function formatPeriod(row: LiftingCalendarSummaryRow): string {
  const start = new Date(`${row.periodStart}T00:00:00Z`);
  const end = new Date(`${row.periodEnd}T00:00:00Z`);
  const format = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (row.periodKind === 'MONTH') {
    return new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
  }
  return `${format.format(start)} – ${format.format(end)}`;
}

function deltaText(value: number | null, noun: string): string {
  if (value === null) return 'No prior period yet';
  if (value === 0) return `No change vs prior ${noun}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)} vs prior ${noun}`;
}

function volumeDeltaText(value: number | null, noun: string): string {
  if (value === null) return 'No prior period yet';
  if (value === 0) return `No change vs prior ${noun}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)} kg·reps vs prior ${noun}`;
}

function PeriodCard({
  title,
  row,
  delta,
  priorLabel,
}: {
  title: string;
  row: LiftingCalendarSummaryRow | null;
  delta: LiftingCalendarDelta;
  priorLabel: 'week' | 'month';
}) {
  return (
    <article className={styles.periodCard}>
      <header>
        <p>{title}</p>
        <h3>{row ? formatPeriod(row) : 'No calendar data yet'}</h3>
      </header>
      {row ? (
        <dl className={styles.metricGrid}>
          <div>
            <dt>Sessions</dt>
            <dd>{row.completedLiftingSessions}</dd>
            <small>{deltaText(delta.completedLiftingSessions, priorLabel)}</small>
          </div>
          <div>
            <dt>Exercises</dt>
            <dd>{row.exerciseCount}</dd>
            <small>{deltaText(delta.exerciseCount, priorLabel)}</small>
          </div>
          <div>
            <dt>Working sets</dt>
            <dd>{row.completedWorkingSets}</dd>
            <small>{deltaText(delta.completedWorkingSets, priorLabel)}</small>
          </div>
          <div>
            <dt>PRs</dt>
            <dd>{row.prCount}</dd>
            <small>{deltaText(delta.prCount, priorLabel)}</small>
          </div>
          <div className={styles.volumeMetric}>
            <dt>Volume</dt>
            <dd>{formatNumber(row.volumeKgReps)} kg·reps</dd>
            <small>{volumeDeltaText(delta.volumeKgReps, priorLabel)}</small>
          </div>
        </dl>
      ) : (
        <p className={styles.empty}>Complete a lifting session to start calendar summaries.</p>
      )}
    </article>
  );
}

export function LiftingCalendarSummaryPanel({ analytics, status, error, onRetry }: LiftingCalendarSummaryProps) {
  const weeklyVolume = analytics.weekly.map((row) => ({ id: `week-${row.periodStart}`, observedAt: row.periodStart, value: row.volumeKgReps }));
  const monthlyVolume = analytics.monthly.map((row) => ({ id: `month-${row.periodStart}`, observedAt: row.periodStart, value: row.volumeKgReps }));

  return (
    <section className={styles.calendarSection} aria-labelledby="lifting-calendar-heading">
      <div className={styles.heading}>
        <div>
          <p>Training load</p>
          <h2 id="lifting-calendar-heading">Weekly &amp; monthly summary</h2>
        </div>
        <span>Completed strength sessions only. Volume is analytics-only and never changes XP.</span>
      </div>

      {status === 'loading' && <p className={styles.state}>Loading calendar summaries…</p>}
      {status === 'error' && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <Button onClick={onRetry} variant="secondary">Retry summaries</Button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className={styles.periodGrid}>
            <PeriodCard delta={analytics.weekDelta} priorLabel="week" row={analytics.currentWeek} title="This week" />
            <PeriodCard delta={analytics.monthDelta} priorLabel="month" row={analytics.currentMonth} title="This month" />
          </div>
          <div className={styles.chartGrid} aria-label="Calendar lifting volume charts">
            <ExerciseTrendChart
              description={`${analytics.weekly.length} calendar weeks · analytics only`}
              formatValue={(value) => `${formatNumber(value)} kg·reps`}
              points={weeklyVolume}
              title="Weekly volume"
              variant="bars"
            />
            <ExerciseTrendChart
              description={`${analytics.monthly.length} calendar months · analytics only`}
              formatValue={(value) => `${formatNumber(value)} kg·reps`}
              points={monthlyVolume}
              title="Monthly volume"
              variant="bars"
            />
          </div>
        </>
      )}
    </section>
  );
}
