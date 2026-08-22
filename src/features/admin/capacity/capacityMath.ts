import {
  CAPACITY_WARNING_THRESHOLDS,
  type CapacityGrowthEstimate,
  type CapacityMetricAssessment,
  type CapacityMetricMeasurement,
  type CapacitySnapshot,
  type CapacityThresholds,
} from './model';

const MILLISECONDS_PER_DAY = 86_400_000;

export function validateCapacityThresholds(
  thresholds: CapacityThresholds = CAPACITY_WARNING_THRESHOLDS,
): CapacityThresholds {
  const { watch, warning, critical } = thresholds;
  const values = [watch, warning, critical];

  if (values.some((value) => !Number.isFinite(value) || value <= 0 || value >= 100)) {
    throw new Error('Capacity warning thresholds must be finite percentages between 0 and 100.');
  }

  if (!(watch < warning && warning < critical)) {
    throw new Error('Capacity warning thresholds must increase from watch to warning to critical.');
  }

  return thresholds;
}

export function capacityUtilizationPercent(value: number, limit: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Capacity usage must be a finite non-negative number.');
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('Capacity limit must be a finite positive number.');
  }

  return (value / limit) * 100;
}

export function assessCapacityMetric(
  measurement: CapacityMetricMeasurement,
  thresholds: CapacityThresholds = CAPACITY_WARNING_THRESHOLDS,
): CapacityMetricAssessment {
  const checkedThresholds = validateCapacityThresholds(thresholds);

  if (!measurement.available || measurement.value === null) {
    return { ...measurement, utilizationPercent: null, status: 'UNAVAILABLE' };
  }

  if (!Number.isFinite(measurement.value) || measurement.value < 0) {
    throw new Error(`Capacity metric ${measurement.code} has an invalid usage value.`);
  }

  if (measurement.limit === null) {
    return { ...measurement, utilizationPercent: null, status: 'UNCONFIGURED' };
  }

  const utilizationPercent = capacityUtilizationPercent(measurement.value, measurement.limit);
  let status: CapacityMetricAssessment['status'] = 'NORMAL';

  if (utilizationPercent >= 100) status = 'EXCEEDED';
  else if (utilizationPercent >= checkedThresholds.critical) status = 'CRITICAL';
  else if (utilizationPercent >= checkedThresholds.warning) status = 'WARNING';
  else if (utilizationPercent >= checkedThresholds.watch) status = 'WATCH';

  return { ...measurement, utilizationPercent, status };
}

export function estimateCapacityGrowth(
  previous: CapacityMetricMeasurement,
  current: CapacityMetricMeasurement,
): CapacityGrowthEstimate | null {
  if (previous.code !== current.code || previous.source !== current.source || previous.unit !== current.unit) {
    return null;
  }
  if (!previous.available || !current.available || previous.value === null || current.value === null) {
    return null;
  }

  const previousAt = Date.parse(previous.measuredAt);
  const currentAt = Date.parse(current.measuredAt);
  const elapsedDays = (currentAt - previousAt) / MILLISECONDS_PER_DAY;
  const growth = current.value - previous.value;

  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0 || growth <= 0) return null;

  const unitsPerDay = growth / elapsedDays;
  const limit = current.limit;
  let daysUntilLimit: number | null = null;

  if (limit !== null && Number.isFinite(limit) && limit > 0) {
    daysUntilLimit = current.value >= limit ? 0 : (limit - current.value) / unitsPerDay;
  }

  return {
    metricCode: current.code,
    source: current.source,
    unitsPerDay,
    daysUntilLimit,
  };
}

export function latestComparableMeasurements(
  snapshots: CapacitySnapshot[],
  metric: CapacityMetricMeasurement,
): CapacityMetricMeasurement[] {
  return snapshots
    .flatMap((snapshot) => snapshot.metrics)
    .filter((candidate) => (
      candidate.code === metric.code
      && candidate.source === metric.source
      && candidate.unit === metric.unit
      && candidate.available
      && candidate.value !== null
    ))
    .sort((left, right) => Date.parse(right.measuredAt) - Date.parse(left.measuredAt))
    .slice(0, 2);
}
