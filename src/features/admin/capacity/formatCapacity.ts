import type { CapacityMetricAssessment, CapacityMetricMeasurement, CapacityStatus } from './model';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatCapacityValue(metric: Pick<CapacityMetricMeasurement, 'unit' | 'value'>): string {
  if (metric.value === null) return 'Unavailable';
  if (metric.unit === 'bytes') {
    if (metric.value === 0) return '0 B';
    const index = Math.min(Math.floor(Math.log(metric.value) / Math.log(1024)), BYTE_UNITS.length - 1);
    const divisor = 1024 ** index;
    const value = metric.value / divisor;
    return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: value >= 10 ? 1 : 2 }).format(value)} ${BYTE_UNITS[index]}`;
  }
  if (metric.unit === 'credits') {
    return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(metric.value)} credits`;
  }
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(metric.value);
}

export function formatCapacityLimit(metric: Pick<CapacityMetricMeasurement, 'unit' | 'limit'>): string {
  if (metric.limit === null) return 'No allowance configured';
  return `of ${formatCapacityValue({ unit: metric.unit, value: metric.limit })}`;
}

export function capacityStatusLabel(status: CapacityStatus): string {
  const labels: Record<CapacityStatus, string> = {
    UNAVAILABLE: 'Unavailable',
    UNCONFIGURED: 'Unconfigured',
    NORMAL: 'Normal',
    WATCH: 'Watch',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
    EXCEEDED: 'Exceeded',
  };
  return labels[status];
}

export function formatUtilization(metric: Pick<CapacityMetricAssessment, 'utilizationPercent'>): string | null {
  if (metric.utilizationPercent === null) return null;
  return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(metric.utilizationPercent)}%`;
}

export function formatMeasuredAt(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}
