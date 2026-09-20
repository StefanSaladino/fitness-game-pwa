import type { MuscleVolumeMuscleGroup, MuscleVolumeSummary, MuscleVolumeWindowDays } from './model';
import {
  buildMusclePerformanceMonitor,
  type MusclePerformanceSourceObservation,
  type MusclePerformanceSourceSummary,
} from './musclePerformanceMonitor';
import type { MusclePerformanceMonitor } from './performanceTrendEngine';
import {
  buildMuscleVolumeRecommendation,
  type MuscleVolumeRecommendation,
} from './volumeRecommendationEngine';

export interface MuscleVolumeRecommendationPayload {
  muscleGroup: MuscleVolumeMuscleGroup;
  windowDays: MuscleVolumeWindowDays;
  performance: MusclePerformanceMonitor;
  sources: MusclePerformanceSourceSummary[];
  recommendation: MuscleVolumeRecommendation;
}

function payloadKey(
  muscleGroup: MuscleVolumeMuscleGroup,
  windowDays: MuscleVolumeWindowDays,
): string {
  return `${muscleGroup}:${windowDays}`;
}

export function buildMuscleVolumeRecommendationPayloads(
  volumeRows: MuscleVolumeSummary[],
  performanceObservations: MusclePerformanceSourceObservation[],
): MuscleVolumeRecommendationPayload[] {
  const monitorCache = new Map<
    MuscleVolumeMuscleGroup,
    ReturnType<typeof buildMusclePerformanceMonitor>
  >();

  return volumeRows.map((volume) => {
    let performanceResult = monitorCache.get(volume.muscleGroup);

    if (!performanceResult) {
      performanceResult = buildMusclePerformanceMonitor(
        volume.muscleGroup,
        performanceObservations,
      );
      monitorCache.set(volume.muscleGroup, performanceResult);
    }

    return {
      muscleGroup: volume.muscleGroup,
      windowDays: volume.windowDays,
      performance: performanceResult.monitor,
      sources: performanceResult.sources,
      recommendation: buildMuscleVolumeRecommendation(
        volume,
        performanceResult.monitor,
      ),
    };
  });
}

export function indexMuscleVolumeRecommendationPayloads(
  payloads: MuscleVolumeRecommendationPayload[],
): Map<string, MuscleVolumeRecommendationPayload> {
  return new Map(
    payloads.map((payload) => [
      payloadKey(payload.muscleGroup, payload.windowDays),
      payload,
    ]),
  );
}

export function muscleVolumeRecommendationPayloadKey(
  muscleGroup: MuscleVolumeMuscleGroup,
  windowDays: MuscleVolumeWindowDays,
): string {
  return payloadKey(muscleGroup, windowDays);
}
