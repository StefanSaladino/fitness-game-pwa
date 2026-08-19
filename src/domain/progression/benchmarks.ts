import type { ExerciseBaselineState } from '../types';

export function exerciseBaselineState(validPriorObservationCount: number): ExerciseBaselineState {
  if (!Number.isFinite(validPriorObservationCount) || validPriorObservationCount <= 0) return 'UNSEEN';
  return 'ESTABLISHED';
}

export function selectPriorHigherIsBetterPersonalBest(observations: readonly number[]): number | null {
  const valid = observations.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.max(...valid) : null;
}

/** @deprecated v0.3 establishes an exercise baseline after the first valid observation. */
export const benchmarkState = exerciseBaselineState;

/** @deprecated Use selectPriorHigherIsBetterPersonalBest. */
export const selectInitialHigherIsBetterBenchmark = selectPriorHigherIsBetterPersonalBest;
