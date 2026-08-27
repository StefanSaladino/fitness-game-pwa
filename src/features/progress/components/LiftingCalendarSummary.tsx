import { useState } from 'react';
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

type PeriodSelection = 'week' | 'month';

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

function PeriodSummary({ row, delta, priorLabel }: {
  row: LiftingCalendarSummaryRow | null;
  delta: LiftingCalendarDelta;
  priorLabel: 'week' | 'month';
}) {
  if (!row) {
    return <p className={styles.empty}>Complete a lifting session to start calendar summaries.</p>;
  }

  return (
    <div className={styles.periodSummary}>
      <header className={styles.periodHeader}>
        <div>
          <p>{priorLabel === 'week' ? 'This week' : 'This month'}</p>
          <h3>{formatPeriod(row)}</h3>
        </div>
        <span>{row.exerciseCount} exercise{row.exerciseCount === 1 ? '' : 's'}</span>
      </header>

      <dl className={styles.metricGrid}>
        <div>
          <dt>Sessions</dt>
          <dd>{row.completedLiftingSessions}</dd>
          <small>{deltaText(delta.completedLiftingSessions, priorLabel)}</small>
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
        <div>
          <dt>Volume</dt>
          <dd>{formatNumber(row.volumeKgReps)} kg·reps</dd>
          <small>{volumeDeltaText(delta.volumeKgReps, priorLabel)}</small>
        </div>
      </dl>
    </div>
  );
}

export function LiftingCalendarSummaryPanel({ analytics, status, error, onRetry }: LiftingCalendarSummaryProps) {
  const [period, setPeriod] = useState<PeriodSelection>('week');
  const weekly = period === 'week';
  const rows = weekly ? analytics.weekly : analytics.monthly;
  const row = weekly ? analytics.currentWeek : analytics.currentMonth;
  const delta = weekly ? analytics.weekDelta : analytics.monthDelta;
  const priorLabel = weekly ? 'week' as const : 'month' as const;
  const volumePoints = rows.map((item) => ({
    id: `${period}-${item.periodStart}`,
    observedAt: item.periodStart,
    value: item.volumeKgReps,
  }));

  return (
    <section
      className={styles.calendarSection}
      aria-labelledby="lifting-calendar-heading"
      data-app-surface="category"
      data-progress-surface="calendar-summary"
    >
      <div className={styles.heading}>
        <div>
          <p>Training load</p>
          <h2 id="lifting-calendar-heading">Weekly &amp; monthly summary</h2>
        </div>
        <span>Completed strength sessions only. Volume is analytics-only and never changes XP.</span>
      </div>

      <div aria-label="Progress summary period" className={styles.periodToggle} role="group">
        <button aria-pressed={weekly} onClick={() => setPeriod('week')} type="button">Week</button>
        <button aria-pressed={!weekly} onClick={() => setPeriod('month')} type="button">Month</button>
      </div>

      {status === 'loading' && <p className={styles.state}>Loading calendar summaries…</p>}
      {status === 'error' && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <Button onClick={onRetry} variant="secondary">Retry summaries</Button>
        </div>
      )}

      {status === 'ready' && (
        <div className={styles.analyticsLayout}>
          <PeriodSummary delta={delta} priorLabel={priorLabel} row={row} />
          <ExerciseTrendChart
            description={`${rows.length} calendar ${weekly ? 'week' : 'month'}${rows.length === 1 ? '' : 's'} · analytics only`}
            formatValue={(value) => `${formatNumber(value)} kg·reps`}
            points={volumePoints}
            title={weekly ? 'Weekly volume' : 'Monthly volume'}
            variant="bars"
          />
        </div>
      )}
    </section>
  );
}
