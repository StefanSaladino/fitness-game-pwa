import type {
  CapacityMetricCode,
  CapacityMetricMeasurement,
  CapacityMetricScope,
  CapacityTelemetrySource,
} from './model';

export interface CapacityTelemetryRequest {
  metricCodes?: CapacityMetricCode[];
}

export interface CapacityTelemetryResult {
  source: CapacityTelemetrySource;
  fetchedAt: string;
  metrics: CapacityMetricMeasurement[];
  scope?: CapacityMetricScope;
}

export interface CapacityTelemetryProvider {
  readonly source: CapacityTelemetrySource;
  read(request?: CapacityTelemetryRequest): Promise<CapacityTelemetryResult>;
}

export interface CapacityProviderRegistry {
  databaseLocal?: CapacityTelemetryProvider;
  supabaseManagement?: CapacityTelemetryProvider;

}
