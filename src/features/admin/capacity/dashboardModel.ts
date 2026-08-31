import type {
  CapacityMetricAssessment,
  CapacitySnapshot,
} from './model';
import type { NetlifyApiCapability } from './netlifyApiProvider';
import type { CapacityTelemetryResult } from './provider';

export interface CapacityDashboardSnapshot {
  fetchedAt: string;
  current: CapacityMetricAssessment[];
  history: CapacitySnapshot[];
  supabase: CapacityTelemetryResult;
  netlify: CapacityTelemetryResult & { capability?: NetlifyApiCapability };
}
