import { REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS } from '../config';
import type { BenchmarkState } from '../types';

export function benchmarkState(validPriorObservationCount: number): BenchmarkState {
  if (!Number.isFinite(validPriorObservationCount) || validPriorObservationCount <= 0) return 'UNSEEN';
  if (validPriorObservationCount < REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS) return 'CALIBRATING';
  return 'ESTABLISHED';
}

export function selectInitialHigherIsBetterBenchmark(observations: readonly number[]): number | null {
  const valid = observations.filter((value) => Number.isFinite(value));
  if (valid.length < REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS) return null;
  return Math.max(...valid.slice(0, REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS));
}

export function selectInitialLowerIsBetterBenchmark(observations: readonly number[]): number | null {
  const valid = observations.filter((value) => Number.isFinite(value));
  if (valid.length < REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS) return null;
  return Math.min(...valid.slice(0, REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS));
}
