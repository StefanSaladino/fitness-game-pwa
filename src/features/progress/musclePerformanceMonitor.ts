import type { MuscleVolumeMuscleGroup } from './model';
import {
  classifyMusclePerformanceTrend,
  type MusclePerformanceMonitor,
  type MusclePerformanceSample,
  type PerformanceTrendConfidence,
} from './performanceTrendEngine';

export interface MusclePerformanceSourceObservation {
  muscleGroup: MuscleVolumeMuscleGroup;
  exerciseId: string;
  canonicalName: string;
  contributionRole: 'DIRECT' | 'INDIRECT';
  contributionWeight: number;
  scoringDate: string;
  observedAt: string;
  relativePerformanceIndex: number;
}

export interface MusclePerformanceSourceSummary {
  exerciseId: string;
  canonicalName: string;
  contributionRole: 'DIRECT' | 'INDIRECT';
  contributionWeight: number;
  observationCount: number;
  latestObservedAt: string;
  latestRelativePerformanceIndex: number;
}

export interface MusclePerformanceResult {
  muscleGroup: MuscleVolumeMuscleGroup;
  monitor: MusclePerformanceMonitor;
  sources: MusclePerformanceSourceSummary[];
}

type ValidObservation = MusclePerformanceSourceObservation & {
  scoringDayMs: number;
  observedAtMs: number;
};

function validObservations(
  observations: MusclePerformanceSourceObservation[],
): ValidObservation[] {
  return observations
    .map((observation) => ({
      ...observation,
      scoringDayMs: Date.parse(`${observation.scoringDate}T00:00:00Z`),
      observedAtMs: Date.parse(observation.observedAt),
    }))
    .filter(
      (observation) =>
        Number.isFinite(observation.scoringDayMs) &&
        Number.isFinite(observation.observedAtMs) &&
        Number.isFinite(observation.relativePerformanceIndex) &&
        observation.relativePerformanceIndex > 0 &&
        Number.isFinite(observation.contributionWeight) &&
        observation.contributionWeight > 0,
    )
    .sort((left, right) => {
      const dayDifference = left.scoringDayMs - right.scoringDayMs;
      return dayDifference !== 0
        ? dayDifference
        : left.observedAtMs - right.observedAtMs;
    });
}

function compositeDailySamples(
  observations: ValidObservation[],
): MusclePerformanceSample[] {
  const byDay = new Map<
    string,
    {
      weightedTotal: number;
      totalWeight: number;
      latestMs: number;
    }
  >();

  for (const observation of observations) {
    // contributionWeight already encodes the reviewed direct/indirect
    // contribution (for example 1.0 direct, 0.5 indirect). Apply it once.
    const effectiveWeight = observation.contributionWeight;

    const aggregate = byDay.get(observation.scoringDate) ?? {
      weightedTotal: 0,
      totalWeight: 0,
      latestMs: observation.observedAtMs,
    };

    aggregate.weightedTotal +=
      observation.relativePerformanceIndex * effectiveWeight;
    aggregate.totalWeight += effectiveWeight;
    aggregate.latestMs = Math.max(aggregate.latestMs, observation.observedAtMs);
    byDay.set(observation.scoringDate, aggregate);
  }

  return [...byDay.entries()]
    .filter(([, aggregate]) => aggregate.totalWeight > 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([day, aggregate]) => ({
      exerciseId: `muscle-day:${day}`,
      observedAt: `${day}T12:00:00.000Z`,
      relativePerformanceIndex:
        aggregate.weightedTotal / aggregate.totalWeight,
    }));
}

function spanDays(observations: ValidObservation[]): number {
  if (observations.length < 2) return 0;

  return Math.max(
    0,
    Math.round(
      (
        observations[observations.length - 1]!.scoringDayMs -
        observations[0]!.scoringDayMs
      ) / 86_400_000,
    ),
  );
}

function confidenceForComposite(
  evidenceCount: number,
  exerciseCount: number,
  span: number,
): PerformanceTrendConfidence {
  if (evidenceCount >= 8 && exerciseCount >= 2 && span >= 28) return 'HIGH';
  if (evidenceCount >= 4 && span >= 14) return 'MODERATE';
  return 'LOW';
}

function sourceSummaries(
  observations: ValidObservation[],
): MusclePerformanceSourceSummary[] {
  const grouped = new Map<string, ValidObservation[]>();

  for (const observation of observations) {
    const current = grouped.get(observation.exerciseId) ?? [];
    current.push(observation);
    grouped.set(observation.exerciseId, current);
  }

  return [...grouped.values()]
    .map((rows) => {
      const latest = rows[rows.length - 1]!;
      return {
        exerciseId: latest.exerciseId,
        canonicalName: latest.canonicalName,
        contributionRole: latest.contributionRole,
        contributionWeight: latest.contributionWeight,
        observationCount: rows.length,
        latestObservedAt: latest.observedAt,
        latestRelativePerformanceIndex: latest.relativePerformanceIndex,
      };
    })
    .sort((left, right) => {
      if (left.contributionRole !== right.contributionRole) {
        return left.contributionRole === 'DIRECT' ? -1 : 1;
      }
      if (left.observationCount !== right.observationCount) {
        return right.observationCount - left.observationCount;
      }
      return left.canonicalName.localeCompare(right.canonicalName);
    });
}

export function buildMusclePerformanceMonitor(
  muscleGroup: MuscleVolumeMuscleGroup,
  input: MusclePerformanceSourceObservation[],
): MusclePerformanceResult {
  const observations = validObservations(
    input.filter((observation) => observation.muscleGroup === muscleGroup),
  );

  const observationsByExercise = new Map<string, ValidObservation[]>();
  for (const observation of observations) {
    const current = observationsByExercise.get(observation.exerciseId) ?? [];
    current.push(observation);
    observationsByExercise.set(observation.exerciseId, current);
  }

  // A performance trend must come from repeated, comparable observations of
  // the same exercise. One-off movements still count toward volume, but they
  // cannot establish improving, plateauing, or declining performance.
  const comparableObservations = [...observationsByExercise.values()]
    .filter((rows) => rows.length >= 2)
    .flat()
    .sort((left, right) => {
      const dayDifference = left.scoringDayMs - right.scoringDayMs;
      return dayDifference !== 0
        ? dayDifference
        : left.observedAtMs - right.observedAtMs;
    });

  const samples = compositeDailySamples(comparableObservations);
  const classified = classifyMusclePerformanceTrend(samples);
  const exercises = new Set(
    comparableObservations.map((observation) => observation.exerciseId),
  );
  const span = spanDays(comparableObservations);

  return {
    muscleGroup,
    monitor: {
      ...classified,
      evidenceCount: samples.length,
      exerciseCount: exercises.size,
      spanDays: span,
      confidence: confidenceForComposite(samples.length, exercises.size, span),
    },
    sources: sourceSummaries(comparableObservations),
  };
}

export function buildAllMusclePerformanceMonitors(
  input: MusclePerformanceSourceObservation[],
): MusclePerformanceResult[] {
  const muscleGroups = [
    ...new Set(input.map((observation) => observation.muscleGroup)),
  ];

  return muscleGroups
    .sort((left, right) => left.localeCompare(right))
    .map((muscleGroup) => buildMusclePerformanceMonitor(muscleGroup, input));
}
