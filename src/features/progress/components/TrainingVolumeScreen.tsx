import { useMemo, useState, type CSSProperties } from 'react';
import progressBanner from '../../../assets/fitness/top-set-progress-log.jpg';
import backIcon from '../../../assets/muscle-groups/back.png';
import frontDeltsIcon from '../../../assets/muscle-groups/front-delts.png';
import latsIcon from '../../../assets/muscle-groups/lats.png';
import rearDeltsIcon from '../../../assets/muscle-groups/rear-delts.png';
import sideDeltsIcon from '../../../assets/muscle-groups/side-delts.png';
import spinalErectorsIcon from '../../../assets/muscle-groups/spinal-erectors.png';
import trapsIcon from '../../../assets/muscle-groups/traps.png';
import upperBackIcon from '../../../assets/muscle-groups/upper-back.png';
import bicepsIcon from '../../../assets/muscle-groups/biceps.png';
import calvesIcon from '../../../assets/muscle-groups/calves.png';
import chestIcon from '../../../assets/muscle-groups/chest.png';
import coreIcon from '../../../assets/muscle-groups/core.png';
import forearmsGripIcon from '../../../assets/muscle-groups/forearms-grip.png';
import glutesIcon from '../../../assets/muscle-groups/glutes.png';
import hamstringsIcon from '../../../assets/muscle-groups/hamstrings.png';
import neckIcon from '../../../assets/muscle-groups/neck.png';
import obliquesIcon from '../../../assets/muscle-groups/obliques.png';
import quadsIcon from '../../../assets/muscle-groups/quads.png';
import shouldersIcon from '../../../assets/muscle-groups/shoulders.png';
import tricepsIcon from '../../../assets/muscle-groups/triceps.png';
import type { AppSection } from '../../../components/layout';
import { AppShell, DestinationBanner } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseProgressStatus } from '../hooks/useExerciseProgress';
import {
  MUSCLE_VOLUME_MUSCLE_GROUPS,
  type MuscleVolumeMuscleGroup,
  type MuscleVolumeStatus,
  type MuscleVolumeSummary,
  type MuscleVolumeWindowDays,
} from '../model';
import type { MusclePerformanceTrend } from '../performanceTrendEngine';
import {
  indexMuscleVolumeRecommendationPayloads,
  muscleVolumeRecommendationPayloadKey,
  type MuscleVolumeRecommendationPayload,
} from '../muscleVolumeRecommendationModel';
import type { VolumeRecommendationAction } from '../volumeRecommendationEngine';
import styles from './TrainingVolumeScreen.module.css';

interface TrainingVolumeScreenProps {
  profile: OnboardingProfile;
  rows: MuscleVolumeSummary[];
  status: ExerciseProgressStatus;
  error: string;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onBack: () => void;
  onRetry: () => void;
  recommendations?: MuscleVolumeRecommendationPayload[];
  recommendationStatus?: ExerciseProgressStatus;
  recommendationError?: string;
  onRetryRecommendations?: () => void;
}

const MUSCLE_META: Record<
  MuscleVolumeMuscleGroup,
  { label: string; icon: string; categoryLabel: string }
> = {
  CHEST: { label: 'Chest', icon: chestIcon, categoryLabel: 'Chest' },
  LATS: { label: 'Lats', icon: latsIcon, categoryLabel: 'Back' },
  UPPER_BACK: { label: 'Upper back', icon: upperBackIcon, categoryLabel: 'Back' },
  TRAPS: { label: 'Traps', icon: trapsIcon, categoryLabel: 'Back' },
  SPINAL_ERECTORS: { label: 'Spinal erectors', icon: spinalErectorsIcon, categoryLabel: 'Back' },
  ANTERIOR_DELTS: { label: 'Front delts', icon: frontDeltsIcon, categoryLabel: 'Shoulders' },
  LATERAL_DELTS: { label: 'Side delts', icon: sideDeltsIcon, categoryLabel: 'Shoulders' },
  POSTERIOR_DELTS: { label: 'Rear delts', icon: rearDeltsIcon, categoryLabel: 'Shoulders' },
  BACK: { label: 'Back', icon: backIcon, categoryLabel: 'Back' },
  SHOULDERS: { label: 'Shoulders', icon: shouldersIcon, categoryLabel: 'Shoulders' },
  BICEPS: { label: 'Biceps', icon: bicepsIcon, categoryLabel: 'Arms' },
  TRICEPS: { label: 'Triceps', icon: tricepsIcon, categoryLabel: 'Arms' },
  QUADS: { label: 'Quads', icon: quadsIcon, categoryLabel: 'Legs' },
  HAMSTRINGS: { label: 'Hamstrings', icon: hamstringsIcon, categoryLabel: 'Legs' },
  GLUTES: { label: 'Glutes', icon: glutesIcon, categoryLabel: 'Legs' },
  CALVES: { label: 'Calves', icon: calvesIcon, categoryLabel: 'Legs' },
  FOREARMS_GRIP: { label: 'Forearms & grip', icon: forearmsGripIcon, categoryLabel: 'Arms' },
  CORE: { label: 'Core', icon: coreIcon, categoryLabel: 'Core' },
  OBLIQUES: { label: 'Obliques', icon: obliquesIcon, categoryLabel: 'Core' },
  NECK: { label: 'Neck', icon: neckIcon, categoryLabel: 'Neck' },
};

const ACTIVE_VOLUME_TARGET_MUSCLE_GROUPS = MUSCLE_VOLUME_MUSCLE_GROUPS.filter(
  (muscleGroup): muscleGroup is Exclude<
    (typeof MUSCLE_VOLUME_MUSCLE_GROUPS)[number],
    'NECK'
  > => muscleGroup !== 'NECK',
);

const LEGACY_VOLUME_TARGET_MUSCLE_GROUPS: readonly MuscleVolumeMuscleGroup[] = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'FOREARMS_GRIP',
  'CORE',
  'OBLIQUES',
];

const STATUS_LABELS: Record<MuscleVolumeStatus, string> = {
  NO_DATA: 'No data',
  LOW: 'Low',
  BELOW_TARGET: 'Below target',
  ON_TARGET: 'On target',
  ABOVE_TARGET: 'Above target',
  HIGH_REVIEW: 'High — review',
};

const STATUS_CONTEXT: Record<MuscleVolumeStatus, string> = {
  NO_DATA: 'No eligible effective-set data was found in this window.',
  LOW: 'Effective volume is well below the current target band.',
  BELOW_TARGET: 'Effective volume is below the current target band.',
  ON_TARGET: 'Effective volume is inside the current target band.',
  ABOVE_TARGET: 'Effective volume is above the target band but below the review threshold.',
  HIGH_REVIEW: 'Effective volume is above the review threshold. This is a context flag, not an automatic instruction to reduce training.',
};

const TREND_LABELS: Record<MusclePerformanceTrend, string> = {
  IMPROVING: 'Improving',
  DECLINING: 'Declining',
  STABLE: 'Stable',
  PLATEAU: 'Plateau',
  VARIABLE: 'Variable',
  RECOVERING: 'Recovering',
  REGRESSING: 'Regressing',
  INSUFFICIENT_DATA: 'Gathering data',
};

const ACTION_LABELS: Record<VolumeRecommendationAction, string> = {
  NO_ACTION: 'No action yet',
  MONITOR: 'Monitor',
  MAINTAIN: 'Maintain',
  ADD_VOLUME_CAUTIOUSLY: 'Add cautiously',
  HOLD_AND_REVIEW: 'Hold & review',
  REDUCE_VOLUME_CAUTIOUSLY: 'Reduce cautiously',
};

function formatSets(value: number): string {
  return value.toLocaleString('en-CA', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function formatWindowDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function confidenceLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function meterStyle(row: MuscleVolumeSummary): CSSProperties {
  const scaleMax = Math.max(row.highReviewAbove * 1.1, row.effectiveSets, 1);
  const percent = (value: number) => Math.min(100, Math.max(0, (value / scaleMax) * 100));
  const targetStart = percent(row.targetMin);
  const targetEnd = percent(row.targetMax);

  return {
    '--volume-fill': `${percent(row.effectiveSets)}%`,
    '--target-start': `${targetStart}%`,
    '--target-width': `${Math.max(0, targetEnd - targetStart)}%`,
    '--review-point': `${percent(row.highReviewAbove)}%`,
  } as CSSProperties;
}

function recommendationDelta(
  recommendation: MuscleVolumeRecommendationPayload['recommendation'],
): string {
  const value = recommendation.suggestedEffectiveSetChange;

  if (value === null) return 'No set change yet';
  if (value === 0) return 'No set change';
  return `${value > 0 ? '+' : '−'}${formatSets(Math.abs(value))} effective sets · next 7 days`;
}

function RecommendationPanel({
  payload,
}: {
  payload: MuscleVolumeRecommendationPayload;
}) {
  const { performance, recommendation, sources } = payload;

  return (
    <section
      className={styles.recommendationPanel}
      data-recommendation-action={recommendation.action}
      aria-label={`${TREND_LABELS[performance.trend]} performance recommendation`}
    >
      <div className={styles.recommendationHeader}>
        <div>
          <span>Performance trend</span>
          <strong>{TREND_LABELS[performance.trend]}</strong>
        </div>
        <span className={styles.recommendationAction}>
          {ACTION_LABELS[recommendation.action]}
        </span>
      </div>

      <div className={styles.recommendationMeta}>
        <span>{confidenceLabel(performance.persistence)} trend</span>
        <span>{confidenceLabel(performance.confidence)} confidence</span>
        <span>{performance.evidenceCount} training day{performance.evidenceCount === 1 ? '' : 's'}</span>
        <span>{performance.exerciseCount} exercise{performance.exerciseCount === 1 ? '' : 's'}</span>
      </div>

      <div className={styles.recommendationCopy}>
        <strong>{recommendation.headline}</strong>
        <p>{recommendation.rationale}</p>
      </div>

      <div className={styles.recommendationFooter}>
        <span>{recommendationDelta(recommendation)}</span>
        {sources.length > 0 && (
          <span>
            Evidence: {sources.slice(0, 3).map((source) => source.canonicalName).join(', ')}
          </span>
        )}
      </div>
    </section>
  );
}

function MuscleVolumeCard({
  row,
  recommendation,
}: {
  row: MuscleVolumeSummary;
  recommendation?: MuscleVolumeRecommendationPayload;
}) {
  const meta = MUSCLE_META[row.muscleGroup];
  const highPercent = Math.round(row.highConfidenceProportion * 100);
  const mediumPercent = Math.round(row.mediumConfidenceProportion * 100);
  const lowerPercent = Math.round(row.lowOrProvisionalProportion * 100);

  return (
    <details
      className={styles.muscleCard}
      data-muscle-volume-card
      data-volume-status={row.volumeStatus}
    >
      <summary
        aria-label={`${meta.label} volume details`}
        className={styles.cardSummary}
      >
        <div className={styles.muscleIdentity}>
          <div className={styles.iconFrame}>
            <img alt="" aria-hidden="true" src={meta.icon} />
          </div>
          <div>
            <p>{meta.categoryLabel}</p>
            <h2>{meta.label}</h2>
          </div>
        </div>

        <div className={styles.summaryStats} aria-label={`${meta.label} volume summary`}>
          <div>
            <strong>{formatSets(row.effectiveSets)}</strong>
            <span>effective sets</span>
          </div>
          <div>
            <strong>{formatSets(row.targetMin)}–{formatSets(row.targetMax)}</strong>
            <span>target</span>
          </div>
        </div>

        <span className={styles.statusPill}>{STATUS_LABELS[row.volumeStatus]}</span>

        <span aria-hidden="true" className={styles.summaryToggle}>
          <span className={styles.summaryToggleClosed}>Details</span>
          <span className={styles.summaryToggleOpen}>Close</span>
          <span className={styles.summaryChevron} />
        </span>

        <div className={styles.summaryMeter} aria-hidden="true" style={meterStyle(row)}>
          <span className={styles.targetBand} />
          <span className={styles.meterFill} />
          <span className={styles.reviewMarker} />
        </div>
      </summary>

      <div className={styles.cardBody}>
        <div className={styles.expandedGrid}>
          <section className={styles.volumeDetail}>
            <div className={styles.detailHeading}>
              <span>Volume position</span>
              <strong>{STATUS_LABELS[row.volumeStatus]}</strong>
            </div>

            <p className={styles.volumeContext}>{STATUS_CONTEXT[row.volumeStatus]}</p>
            <div className={styles.targetLabels}>
              <span>Target {formatSets(row.targetMin)}–{formatSets(row.targetMax)}</span>
              <span>Midpoint {formatSets(row.targetMidpoint)}</span>
              <span>Review above {formatSets(row.highReviewAbove)}</span>
            </div>

            <dl className={styles.breakdown}>
              <div>
                <dt>Direct</dt>
                <dd>{formatSets(row.directEffectiveSets)}</dd>
              </div>
              <div>
                <dt>Indirect</dt>
                <dd>{formatSets(row.indirectEffectiveSets)}</dd>
              </div>
              <div>
                <dt>Logical sets</dt>
                <dd>{formatSets(row.eligibleLogicalSets)}</dd>
              </div>
              <div>
                <dt>Scored stages</dt>
                <dd>{formatSets(row.eligibleStages)}</dd>
              </div>
            </dl>
          </section>

          {recommendation && <RecommendationPanel payload={recommendation} />}
        </div>

        <div className={styles.confidence}>
          <div className={styles.confidenceHeading}>
            <span>Set confidence</span>
            <span>{confidenceLabel(row.benchmarkEvidenceConfidence)} benchmark evidence</span>
          </div>

          {row.effectiveSets > 0 ? (
            <>
              <div className={styles.confidenceBar} aria-hidden="true">
                <span style={{ width: `${highPercent}%` }} />
                <span style={{ width: `${mediumPercent}%` }} />
                <span style={{ width: `${lowerPercent}%` }} />
              </div>
              <div className={styles.confidenceLegend}>
                <span>{highPercent}% high</span>
                <span>{mediumPercent}% medium</span>
                <span>{lowerPercent}% lower / provisional</span>
              </div>
            </>
          ) : (
            <p>No eligible effective-set confidence distribution in this window.</p>
          )}
        </div>

        {row.reviewFlaggedLogicalSets > 0 && (
          <p className={styles.reviewNote}>
            {row.reviewFlaggedLogicalSets} logical set{row.reviewFlaggedLogicalSets === 1 ? '' : 's'} flagged for review.
          </p>
        )}
      </div>
    </details>
  );
}

export function TrainingVolumeScreen({
  profile,
  rows,
  status,
  error,
  onNavigate,
  onSignOut,
  onBack,
  onRetry,
  recommendations = [],
  recommendationStatus = 'ready',
  recommendationError = '',
  onRetryRecommendations = () => {},
}: TrainingVolumeScreenProps) {
  const [windowDays, setWindowDays] = useState<MuscleVolumeWindowDays>(7);

  const visibleRows = useMemo(() => {
    const windowRows = rows.filter((row) => row.windowDays === windowDays);
    const byMuscle = new Map(
      windowRows.map((row) => [row.muscleGroup, row] as const),
    );

    const methodologyVersion = windowRows[0]?.methodologyVersion;
    const displayGroups = methodologyVersion === 'muscle-volume-v1'
      ? LEGACY_VOLUME_TARGET_MUSCLE_GROUPS
      : ACTIVE_VOLUME_TARGET_MUSCLE_GROUPS;

    return displayGroups
      .map((muscleGroup) => byMuscle.get(muscleGroup))
      .filter((row): row is MuscleVolumeSummary => Boolean(row));
  }, [rows, windowDays]);

  const recommendationIndex = useMemo(
    () => indexMuscleVolumeRecommendationPayloads(recommendations),
    [recommendations],
  );

  const summary = useMemo(() => {
    const counts = {
      onTarget: 0,
      below: 0,
      above: 0,
      noData: 0,
    };

    for (const row of visibleRows) {
      if (row.volumeStatus === 'ON_TARGET') counts.onTarget += 1;
      else if (row.volumeStatus === 'LOW' || row.volumeStatus === 'BELOW_TARGET') counts.below += 1;
      else if (row.volumeStatus === 'ABOVE_TARGET' || row.volumeStatus === 'HIGH_REVIEW') counts.above += 1;
      else counts.noData += 1;
    }

    return counts;
  }, [visibleRows]);

  const firstRow = visibleRows[0] ?? null;

  return (
    <AppShell
      activeItem="progress"
      mobileTitle="Volume Targets"
      backLabel="Back to Progress"
      onBack={onBack}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username}`}
    >
      <div className={styles.page} data-training-volume-page>
        <DestinationBanner
          className={styles.banner}
          data-progress-surface="volume-identity"
          imagePosition="center 43%"
          imageSrc={progressBanner}
        >
          <div className={styles.bannerCopy}>
            <p>Muscle-volume analytics</p>
            <h1>Volume targets</h1>
            <span>
              Effective sets by muscle group, separated from workout kg·reps and from XP.
            </span>
          </div>

          <div aria-label="Training volume window" className={styles.windowControl} role="group">
            <button
              aria-pressed={windowDays === 7}
              onClick={() => setWindowDays(7)}
              type="button"
            >
              7 days
            </button>
            <button
              aria-pressed={windowDays === 28}
              onClick={() => setWindowDays(28)}
              type="button"
            >
              28 days
            </button>
          </div>
        </DestinationBanner>

        {status === 'loading' && (
          <section className={styles.stateSurface} data-app-surface="category" role="status">
            Loading volume targets…
          </section>
        )}

        {status === 'error' && (
          <section className={styles.stateSurface} data-app-surface="category" role="alert">
            <p>{error || 'Unable to load volume targets right now.'}</p>
            <Button onClick={onRetry} variant="secondary">Retry volume targets</Button>
          </section>
        )}

        {status === 'ready' && visibleRows.length === 0 && (
          <section className={styles.stateSurface} data-app-surface="category">
            <h2>No volume data yet</h2>
            <p>No effective-set data is available for this window yet.</p>
          </section>
        )}

        {status === 'ready' && visibleRows.length > 0 && (
          <>
            <section className={styles.overview} data-app-surface="category">
              <div>
                <p>Current window</p>
                <strong>
                  {firstRow ? `${formatWindowDate(firstRow.windowStart)} – ${formatWindowDate(firstRow.windowEnd)}` : '—'}
                </strong>
                <span>{firstRow?.methodologyVersion ?? 'muscle-volume-v2'}</span>
              </div>

              <div className={styles.summaryStrip} aria-label="Volume target status summary">
                <span><b>{summary.onTarget}</b> on target</span>
                <span><b>{summary.below}</b> below</span>
                <span><b>{summary.above}</b> above / review</span>
                <span><b>{summary.noData}</b> no data</span>
              </div>
            </section>

            {recommendationStatus === 'loading' && (
              <section className={styles.recommendationState} role="status">
                Analyzing your continuing performance trends…
              </section>
            )}

            {recommendationStatus === 'error' && (
              <section className={styles.recommendationState} role="alert">
                <div>
                  <strong>Performance recommendations are temporarily unavailable.</strong>
                  <span>{recommendationError || 'Volume targets are still available.'}</span>
                </div>
                <Button onClick={onRetryRecommendations} variant="secondary">
                  Retry performance analysis
                </Button>
              </section>
            )}

            <section className={styles.cardGrid} aria-label={`${windowDays}-day muscle volume targets`}>
              {visibleRows.map((row) => (
                <MuscleVolumeCard
                  key={`${row.muscleGroup}-${row.windowDays}`}
                  row={row}
                  recommendation={
                    recommendationStatus === 'ready'
                      ? recommendationIndex.get(
                          muscleVolumeRecommendationPayloadKey(
                            row.muscleGroup,
                            row.windowDays,
                          ),
                        )
                      : undefined
                  }
                />
              ))}
            </section>

            <p className={styles.footerNote}>
              Recommendations combine effective-set volume with a normalized 56-day performance trend. A volume threshold alone never triggers an automatic increase or reduction. Any suggested set change is a small next-7-day adjustment, including while viewing the 28-day window; neither raw kg·reps nor XP is used as the recommendation signal.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
