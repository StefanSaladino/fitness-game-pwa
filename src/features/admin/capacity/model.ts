export const CAPACITY_WARNING_THRESHOLDS = {
  watch: 60,
  warning: 75,
  critical: 85,
} as const;

export type CapacityMetricCode =
  | 'database_bytes'
  | 'storage_bytes'
  | 'storage_objects'
  | 'postgres_connections'
  | 'auth_users_total'
  | 'auth_users_30d'
  | 'supabase_monthly_active_users'
  | 'supabase_egress_bytes'
  | 'supabase_cached_egress_bytes'
  | 'supabase_realtime_messages'
  | 'supabase_realtime_peak_connections';

export type CapacityMetricUnit = 'bytes' | 'count' | 'credits';

export type CapacityMetricScope = 'PROJECT' | 'ORGANIZATION';

export type CapacityTelemetrySource =
  | 'DATABASE_LOCAL'
  | 'SUPABASE_MANAGEMENT';

export type CapacityStatus =
  | 'UNAVAILABLE'
  | 'UNCONFIGURED'
  | 'NORMAL'
  | 'WATCH'
  | 'WARNING'
  | 'CRITICAL'
  | 'EXCEEDED';

export interface CapacityThresholds {
  watch: number;
  warning: number;
  critical: number;
}

export interface CapacityMetricMeasurement {
  code: CapacityMetricCode;
  source: CapacityTelemetrySource;
  unit: CapacityMetricUnit;
  value: number | null;
  limit: number | null;
  measuredAt: string;
  available: boolean;
  scope?: CapacityMetricScope;
  note?: string;
}

export interface CapacityMetricAssessment extends CapacityMetricMeasurement {
  utilizationPercent: number | null;
  status: CapacityStatus;
}

export interface CapacitySnapshot {
  capturedAt: string;
  metrics: CapacityMetricMeasurement[];
}

export interface CapacityGrowthEstimate {
  metricCode: CapacityMetricCode;
  source: CapacityTelemetrySource;
  unitsPerDay: number;
  daysUntilLimit: number | null;
}
