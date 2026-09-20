import { useMemo, useState, type CSSProperties } from 'react';
import progressBanner from '../../../assets/fitness/top-set-progress-log.jpg';
import backIcon from '../../../assets/muscle-groups/back.png';
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
}

const MUSCLE_META: Record<MuscleVolumeMuscleGroup, { label: string; icon: string }> = {
  CHEST: { label: 'Chest', icon: chestIcon },
  BACK: { label: 'Back', icon: backIcon },
  SHOULDERS: { label: 'Shoulders', icon: shouldersIcon },
  BICEPS: { label: 'Biceps', icon: bicepsIcon },
  TRICEPS: { label: 'Triceps', icon: tricepsIcon },
  QUADS: { label: 'Quads', icon: quadsIcon },
  HAMSTRINGS: { label: 'Hamstrings', icon: hamstringsIcon },
  GLUTES: { label: 'Glutes', icon: glutesIcon },
  CALVES: { label: 'Calves', icon: calvesIcon },
  FOREARMS_GRIP: { label: 'Forearms & grip', icon: forearmsGripIcon },
  CORE: { label: 'Core', icon: coreIcon },
  OBLIQUES: { label: 'Obliques', icon: obliquesIcon },
  NECK: { label: 'Neck', icon: neckIcon },
};

const VOLUME_TARGET_MUSCLE_GROUPS = MUSCLE_VOLUME_MUSCLE_GROUPS.filter(
  (muscleGroup): muscleGroup is Exclude<MuscleVolumeMuscleGroup, 'NECK'> => muscleGroup !== 'NECK',
);

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

function MuscleVolumeCard({ row }: { row: MuscleVolumeSummary }) {
  const meta = MUSCLE_META[row.muscleGroup];
  const highPercent = Math.round(row.highConfidenceProportion * 100);
  const mediumPercent = Math.round(row.mediumConfidenceProportion * 100);
  const lowerPercent = Math.round(row.lowOrProvisionalProportion * 100);

  return (
    <article className={styles.muscleCard} data-muscle-volume-card data-volume-status={row.volumeStatus}>
      <header className={styles.cardHeader}>
        <div className={styles.muscleIdentity}>
          <div className={styles.iconFrame}>
            <img alt="" aria-hidden="true" src={meta.icon} />
          </div>
          <div>
            <p>Muscle group</p>
            <h2>{meta.label}</h2>
          </div>
        </div>

        <span className={styles.statusPill}>{STATUS_LABELS[row.volumeStatus]}</span>
      </header>

      <div className={styles.primaryMetric}>
        <div>
          <strong>{formatSets(row.effectiveSets)}</strong>
          <span>effective sets</span>
        </div>
        <p>{STATUS_CONTEXT[row.volumeStatus]}</p>
      </div>

      <div
        aria-label={`${meta.label}: ${formatSets(row.effectiveSets)} effective sets; target ${formatSets(row.targetMin)} to ${formatSets(row.targetMax)}`}
        className={styles.meter}
        role="img"
        style={meterStyle(row)}
      >
        <span className={styles.targetBand} aria-hidden="true" />
        <span className={styles.meterFill} aria-hidden="true" />
        <span className={styles.reviewMarker} aria-hidden="true" />
      </div>

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
    </article>
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
}: TrainingVolumeScreenProps) {
  const [windowDays, setWindowDays] = useState<MuscleVolumeWindowDays>(7);

  const visibleRows = useMemo(() => {
    const byMuscle = new Map(
      rows
        .filter((row) => row.windowDays === windowDays)
        .map((row) => [row.muscleGroup, row] as const),
    );

    return VOLUME_TARGET_MUSCLE_GROUPS
      .map((muscleGroup) => byMuscle.get(muscleGroup))
      .filter((row): row is MuscleVolumeSummary => Boolean(row));
  }, [rows, windowDays]);

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
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username}`}
    >
      <div className={styles.page} data-training-volume-page>
        <button aria-label="Back to Progress" className={styles.backButton} onClick={onBack} type="button">
          <span aria-hidden="true">←</span>
          Progress
        </button>

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
                <span>{firstRow?.methodologyVersion ?? 'muscle-volume-v1'}</span>
              </div>

              <div className={styles.summaryStrip} aria-label="Volume target status summary">
                <span><b>{summary.onTarget}</b> on target</span>
                <span><b>{summary.below}</b> below</span>
                <span><b>{summary.above}</b> above / review</span>
                <span><b>{summary.noData}</b> no data</span>
              </div>
            </section>

            <section className={styles.cardGrid} aria-label={`${windowDays}-day muscle volume targets`}>
              {visibleRows.map((row) => (
                <MuscleVolumeCard key={`${row.muscleGroup}-${row.windowDays}`} row={row} />
              ))}
            </section>

            <p className={styles.footerNote}>
              Volume status is descriptive in Phase 19.7. Corrective recommendations arrive in the later recommendation phase and can account for progression and recovery context.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
