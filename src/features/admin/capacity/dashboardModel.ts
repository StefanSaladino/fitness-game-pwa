import type {
  CapacityMetricAssessment,
  CapacitySnapshot,
} from './model';
import type { CapacityTelemetryResult } from './provider';

export interface CapacityDashboardSnapshot {
  fetchedAt: string;
  current: CapacityMetricAssessment[];
  history: CapacitySnapshot[];
  supabase: CapacityTelemetryResult;}
