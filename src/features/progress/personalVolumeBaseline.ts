/**
 * Maintainer boundary: conservative evidence-weighted personalization heuristic.
 * This blends reviewed personal history with the population benchmark prior; it
 * is not a causal optimizer and should not be described as an exact optimal dose.
 */

import type { MuscleVolumeMuscleGroup, MuscleVolumeSummary } from './model';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';

export const PERSONAL_VOLUME_MODEL_VERSION = 'personal-volume-baseline-v1';

export type PersonalVolumeBaselineStatus =
  | 'INSUFFICIENT_DATA'
  | 'EMERGING'
  | 'ESTABLISHED';

export interface WeeklyMuscleVolumeHistory {
  muscleGroup: MuscleVolumeMuscleGroup;
  weekStart: string;
  effectiveSets: number;
  directEffectiveSets: number;
  indirectEffectiveSets: number;
  eligibleLogicalSets: number;
}

export interface PersonalVolumeBaseline {
  muscleGroup: MuscleVolumeMuscleGroup;
  status: PersonalVolumeBaselineStatus;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  modelVersion: string;
  historicalWeekCount: number;
  positiveResponseWeekCount: number;
  spanDays: number;
  learnedMin: number | null;
  learnedMidpoint: number | null;
  learnedMax: number | null;
  populationTargetMin: number;
  populationTargetMidpoint: number;
  populationTargetMax: number;
  blendedTargetMin: number;
  blendedTargetMidpoint: number;
  blendedTargetMax: number;
  personalWeight: number;
  currentEffectiveSets: number;
}

const DAY_MS = 86_400_000;
const MIN_POSITIVE_WEEKS = 6;
const ESTABLISHED_POSITIVE_WEEKS = 10;
const MIN_SPAN_DAYS = 35;
const ESTABLISHED_SPAN_DAYS = 63;
const POSITIVE_RESPONSE_THRESHOLD = 0.01;

function mondayUtc(date: string): string | null {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  const value = new Date(ms);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return value.toISOString().slice(0, 10);
}

function spanDays(rows: readonly WeeklyMuscleVolumeHistory[]): number {
  if (rows.length < 2) return 0;
  const first = Date.parse(`${rows[0]!.weekStart}T00:00:00Z`);
  const last = Date.parse(`${rows[rows.length - 1]!.weekStart}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(0, Math.round((last - first) / DAY_MS));
}

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  const fraction = position - lower;
  return sorted[lower]! * (1 - fraction) + sorted[upper]! * fraction;
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function weeklyPerformanceChange(
  muscleGroup: MuscleVolumeMuscleGroup,
  observations: readonly MusclePerformanceSourceObservation[],
): Map<string, number> {
  const grouped = new Map<string, MusclePerformanceSourceObservation[]>();

  for (const observation of observations) {
    if (observation.muscleGroup !== muscleGroup) continue;
    const week = mondayUtc(observation.scoringDate);
    if (!week) continue;
    const current = grouped.get(week) ?? [];
    current.push(observation);
    grouped.set(week, current);
  }

  const result = new Map<string, number>();

  for (const [week, rows] of grouped) {
    const byExercise = new Map<string, MusclePerformanceSourceObservation[]>();
    for (const row of rows) {
      const current = byExercise.get(row.exerciseId) ?? [];
      current.push(row);
      byExercise.set(row.exerciseId, current);
    }

    let weightedChange = 0;
    let totalWeight = 0;

    for (const exerciseRows of byExercise.values()) {
      const sorted = [...exerciseRows].sort(
        (a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt),
      );
      if (sorted.length < 2) continue;
      const first = sorted[0]!.relativePerformanceIndex;
      const last = sorted[sorted.length - 1]!.relativePerformanceIndex;
      if (!(first > 0) || !Number.isFinite(last)) continue;
      const weight = Math.max(
        ...sorted.map((row) => row.contributionWeight),
      );
      weightedChange += ((last - first) / first) * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) result.set(week, weightedChange / totalWeight);
  }

  return result;
}

export function buildPersonalVolumeBaseline(
  volume: MuscleVolumeSummary,
  weeklyHistory: readonly WeeklyMuscleVolumeHistory[],
  observations: readonly MusclePerformanceSourceObservation[],
): PersonalVolumeBaseline {
  const history = weeklyHistory
    .filter((row) => row.muscleGroup === volume.muscleGroup)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const changes = weeklyPerformanceChange(volume.muscleGroup, observations);
  const positiveVolumes = history
    .filter((row) =>
      (changes.get(row.weekStart) ?? Number.NEGATIVE_INFINITY)
        >= POSITIVE_RESPONSE_THRESHOLD)
    .map((row) => row.effectiveSets)
    .filter((sets) => Number.isFinite(sets) && sets > 0);

  const span = spanDays(history);
  const confidence =
    positiveVolumes.length >= ESTABLISHED_POSITIVE_WEEKS
      && span >= ESTABLISHED_SPAN_DAYS
      ? 'HIGH'
      : positiveVolumes.length >= MIN_POSITIVE_WEEKS
        && span >= MIN_SPAN_DAYS
        ? 'MODERATE'
        : 'LOW';
  const personalWeight = confidence === 'HIGH' ? 0.7
    : confidence === 'MODERATE' ? 0.4
    : 0;

  const learnedMin = personalWeight > 0
    ? roundHalf(quantile(positiveVolumes, 0.25))
    : null;
  const learnedMidpoint = personalWeight > 0
    ? roundHalf(quantile(positiveVolumes, 0.5))
    : null;
  const learnedMax = personalWeight > 0
    ? roundHalf(quantile(positiveVolumes, 0.75))
    : null;

  const blend = (population: number, learned: number | null) =>
    roundHalf(learned === null
      ? population
      : population * (1 - personalWeight) + learned * personalWeight);

  const blendedTargetMin = blend(volume.targetMin, learnedMin);
  const blendedTargetMidpoint = Math.max(
    blendedTargetMin,
    blend(volume.targetMidpoint, learnedMidpoint),
  );
  const blendedTargetMax = Math.max(
    blendedTargetMidpoint,
    blend(volume.targetMax, learnedMax),
  );

  return {
    muscleGroup: volume.muscleGroup,
    status: confidence === 'HIGH'
      ? 'ESTABLISHED'
      : confidence === 'MODERATE'
        ? 'EMERGING'
        : 'INSUFFICIENT_DATA',
    confidence,
    modelVersion: PERSONAL_VOLUME_MODEL_VERSION,
    historicalWeekCount: history.length,
    positiveResponseWeekCount: positiveVolumes.length,
    spanDays: span,
    learnedMin,
    learnedMidpoint,
    learnedMax,
    populationTargetMin: volume.targetMin,
    populationTargetMidpoint: volume.targetMidpoint,
    populationTargetMax: volume.targetMax,
    blendedTargetMin,
    blendedTargetMidpoint,
    blendedTargetMax,
    personalWeight,
    currentEffectiveSets: volume.effectiveSets,
  };
}

export function applyPersonalVolumeBaseline(
  volume: MuscleVolumeSummary,
  baseline: PersonalVolumeBaseline,
): MuscleVolumeSummary {
  if (volume.windowDays !== 7 || baseline.personalWeight <= 0) return volume;

  const targetMin = baseline.blendedTargetMin;
  const targetMidpoint = baseline.blendedTargetMidpoint;
  const targetMax = baseline.blendedTargetMax;
  const highMargin = Math.max(2, volume.highReviewAbove - volume.targetMax);
  const highReviewAbove = roundHalf(targetMax + highMargin);

  const volumeStatus: MuscleVolumeSummary['volumeStatus'] =
    volume.eligibleStages === 0 ? 'NO_DATA'
      : volume.effectiveSets < targetMin * 0.5 ? 'LOW'
      : volume.effectiveSets < targetMin ? 'BELOW_TARGET'
      : volume.effectiveSets <= targetMax ? 'ON_TARGET'
      : volume.effectiveSets > highReviewAbove ? 'HIGH_REVIEW'
      : 'ABOVE_TARGET';

  return {
    ...volume,
    targetMin,
    targetMidpoint,
    targetMax,
    highReviewAbove,
    volumeStatus,
  };
}

export function personalizeMuscleVolumeRows(
  rows: readonly MuscleVolumeSummary[],
  weeklyHistory: readonly WeeklyMuscleVolumeHistory[],
  observations: readonly MusclePerformanceSourceObservation[],
): {
  rows: MuscleVolumeSummary[];
  baselines: PersonalVolumeBaseline[];
} {
  const baselines = rows
    .filter((row) => row.windowDays === 7)
    .map((row) => buildPersonalVolumeBaseline(
      row,
      weeklyHistory,
      observations,
    ));
  const index = new Map(
    baselines.map((baseline) => [baseline.muscleGroup, baseline]),
  );

  return {
    rows: rows.map((row) => {
      const baseline = index.get(row.muscleGroup);
      return baseline ? applyPersonalVolumeBaseline(row, baseline) : row;
    }),
    baselines,
  };
}
