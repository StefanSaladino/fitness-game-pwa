export type MusclePerformanceTrend =
  | 'IMPROVING'
  | 'DECLINING'
  | 'STABLE'
  | 'PLATEAU'
  | 'VARIABLE'
  | 'RECOVERING'
  | 'REGRESSING'
  | 'INSUFFICIENT_DATA';

export type PerformanceTrendPersistence =
  | 'INSUFFICIENT'
  | 'EMERGING'
  | 'SUSTAINED';

export type PerformanceTrendConfidence = 'LOW' | 'MODERATE' | 'HIGH';

export interface MusclePerformanceSample {
  exerciseId: string;
  observedAt: string;
  /**
   * Normalized comparable performance for one exercise/session.
   * 1.00 means equal to that exercise's reference baseline.
   * Values across different exercises are only comparable after normalization.
   */
  relativePerformanceIndex: number;
}

export interface MusclePerformanceMonitor {
  trend: MusclePerformanceTrend;
  persistence: PerformanceTrendPersistence;
  confidence: PerformanceTrendConfidence;
  evidenceCount: number;
  exerciseCount: number;
  spanDays: number;
  overallChange: number | null;
  recentChange: number | null;
  variability: number | null;
}

const MIN_EVIDENCE = 4;
const MIN_EXERCISES_OR_SESSIONS_PROXY = 1;
const MIN_SPAN_DAYS = 14;
const PLATEAU_MIN_EVIDENCE = 5;
const PLATEAU_MIN_SPAN_DAYS = 21;

const DIRECTION_THRESHOLD = 0.025;
const REVERSAL_THRESHOLD = 0.03;
const VARIABLE_RANGE_THRESHOLD = 0.08;
const PLATEAU_RANGE_THRESHOLD = 0.05;

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

function parsedTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daySpan(samples: MusclePerformanceSample[]): number {
  if (samples.length < 2) return 0;
  const first = parsedTime(samples[0]!.observedAt);
  const last = parsedTime(samples[samples.length - 1]!.observedAt);
  return Math.max(0, Math.round((last - first) / 86_400_000));
}

function relativeChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return 0;
  return (to - from) / from;
}

function confidenceFor(
  evidenceCount: number,
  exerciseCount: number,
  spanDays: number,
): PerformanceTrendConfidence {
  if (evidenceCount >= 8 && exerciseCount >= 2 && spanDays >= 28) return 'HIGH';
  if (evidenceCount >= 4 && spanDays >= 14) return 'MODERATE';
  return 'LOW';
}

function persistenceFor(
  evidenceCount: number,
  spanDays: number,
): PerformanceTrendPersistence {
  if (evidenceCount < MIN_EVIDENCE || spanDays < MIN_SPAN_DAYS) return 'INSUFFICIENT';
  if (evidenceCount >= 6 && spanDays >= 21) return 'SUSTAINED';
  return 'EMERGING';
}

function emptyMonitor(
  evidenceCount: number,
  exerciseCount: number,
  spanDays: number,
): MusclePerformanceMonitor {
  return {
    trend: 'INSUFFICIENT_DATA',
    persistence: 'INSUFFICIENT',
    confidence: 'LOW',
    evidenceCount,
    exerciseCount,
    spanDays,
    overallChange: null,
    recentChange: null,
    variability: null,
  };
}

export function classifyMusclePerformanceTrend(
  input: MusclePerformanceSample[],
): MusclePerformanceMonitor {
  const samples = [...input]
    .filter(
      (sample) =>
        Number.isFinite(sample.relativePerformanceIndex) &&
        sample.relativePerformanceIndex > 0 &&
        parsedTime(sample.observedAt) > 0,
    )
    .sort((left, right) => parsedTime(left.observedAt) - parsedTime(right.observedAt));

  const evidenceCount = samples.length;
  const exerciseCount = new Set(samples.map((sample) => sample.exerciseId)).size;
  const spanDays = daySpan(samples);

  if (
    evidenceCount < MIN_EVIDENCE ||
    exerciseCount < MIN_EXERCISES_OR_SESSIONS_PROXY ||
    spanDays < MIN_SPAN_DAYS
  ) {
    return emptyMonitor(evidenceCount, exerciseCount, spanDays);
  }

  const values = samples.map((sample) => sample.relativePerformanceIndex);
  const split = Math.max(2, Math.floor(values.length / 2));
  const early = values.slice(0, split);
  const late = values.slice(split);
  const third = Math.max(2, Math.floor(values.length / 3));
  const firstThird = values.slice(0, third);
  const lastThird = values.slice(-third);

  const earlyMedian = median(early);
  const lateMedian = median(late.length > 0 ? late : early);
  const firstThirdMedian = median(firstThird);
  const lastThirdMedian = median(lastThird);

  const overallChange = relativeChange(earlyMedian, lateMedian);
  const recentChange = relativeChange(firstThirdMedian, lastThirdMedian);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const variability = relativeChange(minimum, maximum);

  let meaningfulUps = 0;
  let meaningfulDowns = 0;

  for (let index = 1; index < values.length; index += 1) {
    const move = relativeChange(values[index - 1]!, values[index]!);
    if (move >= DIRECTION_THRESHOLD) meaningfulUps += 1;
    if (move <= -DIRECTION_THRESHOLD) meaningfulDowns += 1;
  }

  const half = Math.max(2, Math.floor(values.length / 2));
  const earlyHalf = values.slice(0, half);
  const lateHalf = values.slice(-half);
  const earlyHalfChange = relativeChange(earlyHalf[0]!, earlyHalf[earlyHalf.length - 1]!);
  const lateHalfChange = relativeChange(lateHalf[0]!, lateHalf[lateHalf.length - 1]!);

  const persistence = persistenceFor(evidenceCount, spanDays);
  const confidence = confidenceFor(evidenceCount, exerciseCount, spanDays);

  let trend: MusclePerformanceTrend;

  const reversedUp =
    earlyHalfChange <= -REVERSAL_THRESHOLD &&
    lateHalfChange >= REVERSAL_THRESHOLD;

  const reversedDown =
    earlyHalfChange >= REVERSAL_THRESHOLD &&
    lateHalfChange <= -REVERSAL_THRESHOLD;

  if (reversedUp) {
    trend = 'RECOVERING';
  } else if (reversedDown) {
    trend = 'REGRESSING';
  } else if (
    meaningfulUps >= 2 &&
    meaningfulDowns >= 2 &&
    variability >= VARIABLE_RANGE_THRESHOLD
  ) {
    trend = 'VARIABLE';
  } else if (
    Math.abs(overallChange) < DIRECTION_THRESHOLD &&
    variability <= PLATEAU_RANGE_THRESHOLD &&
    evidenceCount >= PLATEAU_MIN_EVIDENCE &&
    spanDays >= PLATEAU_MIN_SPAN_DAYS
  ) {
    trend = 'PLATEAU';
  } else if (overallChange >= DIRECTION_THRESHOLD) {
    trend = 'IMPROVING';
  } else if (overallChange <= -DIRECTION_THRESHOLD) {
    trend = 'DECLINING';
  } else {
    trend = 'STABLE';
  }

  return {
    trend,
    persistence,
    confidence,
    evidenceCount,
    exerciseCount,
    spanDays,
    overallChange,
    recentChange,
    variability,
  };
}

export function trendSupportsCorrectiveAction(
  monitor: MusclePerformanceMonitor,
): boolean {
  if (monitor.persistence !== 'SUSTAINED') return false;
  if (monitor.confidence === 'LOW') return false;

  return (
    monitor.trend === 'PLATEAU' ||
    monitor.trend === 'DECLINING' ||
    monitor.trend === 'REGRESSING'
  );
}
