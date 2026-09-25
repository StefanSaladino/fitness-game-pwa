import { useState } from 'react';
import progressBanner from '../../../assets/fitness/top-set-progress-log.jpg';
import type { AppSection } from '../../../components/layout';
import { AppShell, DestinationBanner } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseProgressStatus } from '../hooks/useExerciseProgress';
import type { MusclePerformanceTrend } from '../performanceTrendEngine';
import type {
  CompletedTrainingReport,
  TrainingReportMuscleResult,
  TrainingReportPeriodKind,
  TrainingReportPeriodSummary,
} from '../trainingReportModel';
import type { VolumeRecommendationAction } from '../volumeRecommendationEngine';
import { downloadMonthlyTrainingReportPdfWithRetention } from '../trainingReportPdfStorageService';
import styles from './TrainingReportScreen.module.css';

interface TrainingReportScreenProps {
  profile: OnboardingProfile;
  report: CompletedTrainingReport | null;
  status: ExerciseProgressStatus;
  error: string;
  periodKind: TrainingReportPeriodKind;
  canGoNext: boolean;
  onSetPeriodKind: (kind: TrainingReportPeriodKind) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
  onBack: () => void;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  LATS: 'Lats',
  UPPER_BACK: 'Upper back',
  TRAPS: 'Traps',
  SPINAL_ERECTORS: 'Spinal erectors',
  ANTERIOR_DELTS: 'Front delts',
  LATERAL_DELTS: 'Side delts',
  POSTERIOR_DELTS: 'Rear delts', BACK: 'Back', SHOULDERS: 'Shoulders', BICEPS: 'Biceps',
  TRICEPS: 'Triceps', QUADS: 'Quads', HAMSTRINGS: 'Hamstrings', GLUTES: 'Glutes',
  CALVES: 'Calves', FOREARMS_GRIP: 'Forearms & grip', CORE: 'Core', OBLIQUES: 'Obliques', NECK: 'Neck',
};

const TREND_LABELS: Record<MusclePerformanceTrend, string> = {
  IMPROVING: 'Improving', DECLINING: 'Declining', STABLE: 'Stable', PLATEAU: 'Plateau',
  VARIABLE: 'Variable', RECOVERING: 'Recovering', REGRESSING: 'Regressing', INSUFFICIENT_DATA: 'Gathering data',
};

const ACTION_LABELS: Record<VolumeRecommendationAction, string> = {
  NO_ACTION: 'Gather evidence', MONITOR: 'Monitor', MAINTAIN: 'Maintain',
  ADD_VOLUME_CAUTIOUSLY: 'Add cautiously', HOLD_AND_REVIEW: 'Hold & review',
  REDUCE_VOLUME_CAUTIOUSLY: 'Reduce cautiously',
};

const ACTIONABLE = new Set<VolumeRecommendationAction>([
  'ADD_VOLUME_CAUTIOUSLY', 'HOLD_AND_REVIEW', 'REDUCE_VOLUME_CAUTIOUSLY',
]);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

function periodLabel(period: TrainingReportPeriodSummary): string {
  if (period.periodKind === 'MONTH') {
    return new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${period.periodStart}T00:00:00Z`));
  }
  return `${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} min`;
  if (minutes <= 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatSets(value: number): string {
  return value.toLocaleString('en-CA', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function muscleName(muscle: TrainingReportMuscleResult): string {
  return MUSCLE_LABELS[muscle.snapshot.muscleGroup] ?? muscle.snapshot.muscleGroup;
}

function actionAdjustment(muscle: TrainingReportMuscleResult): string {
  const value = muscle.correctivePlan.weeklyEffectiveSetAdjustment;
  if (muscle.correctivePlan.action === 'HOLD_AND_REVIEW') {
    return 'Hold volume while you review progression and recovery';
  }
  if (value === null || value === 0) return 'No set change supported';
  return `${value > 0 ? '+' : '−'}${formatSets(Math.abs(value))} effective sets`;
}

function reviewHeadline(report: CompletedTrainingReport): string {
  const actionable = report.muscles.filter((muscle) => ACTIONABLE.has(muscle.correctivePlan.action)).length;
  if (actionable > 0) {
    return `${actionable} muscle group${actionable === 1 ? '' : 's'} ${actionable === 1 ? 'has' : 'have'} a supported next-step adjustment.`;
  }
  const monitor = report.muscles.filter((muscle) => muscle.correctivePlan.action === 'MONITOR').length;
  if (monitor > 0) return 'No volume change is supported yet — keep monitoring the signal.';
  return 'No corrective volume change is supported for this completed period.';
}

function TrendSummary({ report }: { report: CompletedTrainingReport }) {
  const positive = report.muscles.filter((muscle) =>
    muscle.performance.trend === 'IMPROVING' || muscle.performance.trend === 'RECOVERING').length;
  const concern = report.muscles.filter((muscle) =>
    muscle.performance.trend === 'PLATEAU' || muscle.performance.trend === 'DECLINING' || muscle.performance.trend === 'REGRESSING').length;
  return (
    <div className={styles.signalSummary}>
      <div><span>Positive direction</span><strong>{positive}</strong><small>Improving or recovering muscle groups</small></div>
      <div><span>Needs attention</span><strong>{concern}</strong><small>Plateau, decline, or regression signals</small></div>
    </div>
  );
}

function ActionPlanCard({ muscle }: { muscle: TrainingReportMuscleResult }) {
  const preferred = muscle.correctivePlan.preferredExercises;
  return (
    <article className={styles.actionCard} data-action={muscle.correctivePlan.action}>
      <header className={styles.actionCardHeader}>
        <div><span>Next 7 days</span><h3>{muscleName(muscle)}</h3></div>
        <b>{ACTION_LABELS[muscle.correctivePlan.action]}</b>
      </header>
      <div className={styles.actionLead}>
        <strong>{actionAdjustment(muscle)}</strong>
        <span>{TREND_LABELS[muscle.performance.trend]} performance signal</span>
      </div>
      <div className={styles.actionCopy}>
        <h4>{muscle.correctivePlan.headline}</h4>
        <p>{muscle.correctivePlan.rationale}</p>
      </div>
      <footer className={styles.actionFooter}>
        <span>Familiar work</span>
        <strong>{preferred.length > 0 ? preferred.join(' · ') : 'Keep familiar movements while more evidence accumulates'}</strong>
      </footer>
    </article>
  );
}

function QuietGroup({ title, description, muscles }: {
  title: string;
  description: string;
  muscles: TrainingReportMuscleResult[];
}) {
  if (muscles.length === 0) return null;
  return (
    <section className={styles.quietGroup}>
      <header>
        <div><span>Report summary</span><h3>{title}</h3></div>
        <p>{description}</p>
      </header>
      <div className={styles.quietRows}>
        {muscles.map((muscle) => (
          <div key={muscle.snapshot.muscleGroup}>
            <strong>{muscleName(muscle)}</strong>
            <span>{TREND_LABELS[muscle.performance.trend]}</span>
            <small>{muscle.correctivePlan.headline}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrainingReportScreen({
  profile, report, status, error, periodKind, canGoNext, onSetPeriodKind,
  onPrevious, onNext, onRetry, onBack, onNavigate, onSignOut,
}: TrainingReportScreenProps) {
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [pdfError, setPdfError] = useState('');

  const actionable = report?.muscles.filter((muscle) => ACTIONABLE.has(muscle.correctivePlan.action)) ?? [];
  const maintain = report?.muscles.filter((muscle) => muscle.correctivePlan.action === 'MAINTAIN') ?? [];
  const monitor = report?.muscles.filter((muscle) => muscle.correctivePlan.action === 'MONITOR') ?? [];
  const gathering = report?.muscles.filter((muscle) => muscle.correctivePlan.action === 'NO_ACTION') ?? [];

  const canDownloadMonthlyPdf =
    status === 'ready'
    && periodKind === 'MONTH'
    && report?.period.periodKind === 'MONTH';

  const downloadPdf = async () => {
    if (!report || report.period.periodKind !== 'MONTH') return;

    setPdfStatus('generating');
    setPdfError('');

    try {
      await downloadMonthlyTrainingReportPdfWithRetention(
        report,
        profile.displayName,
        profile.id,
      );
      setPdfStatus('idle');
    } catch (caught) {
      setPdfStatus('error');
      setPdfError(
        caught instanceof Error && caught.message.trim()
          ? caught.message
          : 'Unable to generate the monthly PDF right now.',
      );
    }
  };

  return (
    <AppShell activeItem="progress" backLabel="Back to Progress" mobileTitle="Reports" onBack={onBack} onNavigate={onNavigate} onSignOut={onSignOut}
      userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      <div className={styles.page} data-training-report-page>
        <DestinationBanner className={styles.banner} data-progress-surface="report-identity"
          imagePosition="center 43%" imageSrc={progressBanner}>
          <div className={styles.bannerCopy}>
            <p>Completed-period review</p>
            <h1>What changed. What to do next.</h1>
            <span>A decision-focused review of performance direction and supported next-step adjustments.</span>
          </div>
          <div className={styles.kindControl} role="group" aria-label="Report cadence">
            <button aria-pressed={periodKind === 'WEEK'} onClick={() => onSetPeriodKind('WEEK')} type="button">Week</button>
            <button aria-pressed={periodKind === 'MONTH'} onClick={() => onSetPeriodKind('MONTH')} type="button">Month</button>
          </div>
        </DestinationBanner>

        <div className={styles.periodToolbar}>
          <section className={styles.periodBar} data-app-surface="category">
            <button onClick={onPrevious} type="button" aria-label="Previous report period">←</button>
            <div><span>{periodKind === 'WEEK' ? 'Completed week' : 'Completed month'}</span>
              <strong>{report ? periodLabel(report.period) : 'Loading period…'}</strong></div>
            <button disabled={!canGoNext} onClick={onNext} type="button" aria-label="Next report period">→</button>
          </section>

          {canDownloadMonthlyPdf && (
            <button
              className={styles.pdfButton}
              disabled={pdfStatus === 'generating'}
              onClick={() => void downloadPdf()}
              type="button"
            >
              <span>{pdfStatus === 'generating' ? 'Building PDF…' : 'Download monthly PDF'}</span>
              <b aria-hidden="true">↓</b>
            </button>
          )}
        </div>

        {pdfStatus === 'error' && (
          <p className={styles.pdfError} role="alert">{pdfError}</p>
        )}

        {status === 'loading' && (
          <section className={styles.stateSurface} data-app-surface="category">
            <strong>Building your review…</strong><span>Loading completed-period performance and recommendation evidence.</span>
          </section>
        )}
        {status === 'error' && (
          <section className={styles.stateSurface} data-app-surface="category" role="alert">
            <strong>Report unavailable</strong><span>{error}</span><Button onClick={onRetry} variant="secondary">Retry report</Button>
          </section>
        )}

        {status === 'ready' && report && (
          <>
            <section className={styles.reviewBrief} data-app-surface="category" aria-labelledby="report-brief-heading">
              <div className={styles.reviewCopy}>
                <span>Report brief</span><h2 id="report-brief-heading">{reviewHeadline(report)}</h2>
                <p>Only signals that change the next training decision are promoted here. Supporting detail stays available in the underlying Progress and Volume Targets views.</p>
              </div>
              <div className={styles.reviewFacts}>
                <div><span>Active training time</span><strong>{formatDuration(report.period.activeTrainingSeconds)}</strong>
                  <small>{periodKind === 'MONTH' ? 'Frozen completed-month source' : 'Exact completed Monday–Sunday source'}</small></div>
                <div><span>Supported actions</span><strong>{actionable.length}</strong>
                  <small>Muscle groups with an add, reduce, or hold-and-review decision</small></div>
              </div>
              <TrendSummary report={report} />
            </section>

            <section className={styles.actionSection}>
              <header className={styles.sectionHeading}>
                <div><span>Decision layer</span><h2>Next 7 days</h2></div>
                <p>Only muscle groups with enough evidence for a deliberate adjustment appear here.</p>
              </header>
              {actionable.length > 0 ? (
                <div className={styles.actionGrid}>{actionable.map((muscle) =>
                  <ActionPlanCard key={muscle.snapshot.muscleGroup} muscle={muscle} />)}</div>
              ) : (
                <div className={styles.noActionSurface}><span>No corrective change supported</span>
                  <strong>Keep the current plan intact.</strong>
                  <p>The available performance and volume evidence does not justify adding or cutting sets for this completed period.</p></div>
              )}
            </section>

            <QuietGroup title="Keep steady" description="These muscle groups support maintaining current volume rather than changing it." muscles={maintain} />
            <QuietGroup title="Watch, don’t react" description="These signals are worth watching, but the evidence does not support a volume change yet." muscles={monitor} />
            <QuietGroup title="Still gathering evidence" description="Not enough comparable performance evidence exists yet to make a useful corrective call." muscles={gathering} />

            <p className={styles.footerNote}>{periodKind === 'MONTH'
              ? 'Monthly reports use the frozen completed-month source. Corrective amounts remain small next-7-day adjustments.'
              : 'Weekly reports evaluate one completed Monday–Sunday period. Volume alone never triggers an automatic correction.'}</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
