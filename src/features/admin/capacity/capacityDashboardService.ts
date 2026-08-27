import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import { assessCapacityMetric } from './capacityMath';
import type { CapacityDashboardSnapshot } from './dashboardModel';
import type { CapacityMetricCode, CapacityMetricMeasurement, CapacityMetricUnit, CapacitySnapshot } from './model';
import { createDeferredNetlifyCapacityProvider, createNetlifyApiCapacityProvider } from './netlifyApiProvider';
import type { CapacityTelemetryProvider } from './provider';
import { createSupabaseManagementCapacityProvider } from './supabaseManagementProvider';

const DATABASE_LOCAL_CODES = new Set<CapacityMetricCode>([
  'database_bytes',
  'storage_bytes',
  'storage_objects',
  'postgres_connections',
  'auth_users_total',
  'auth_users_30d',
]);

const VALID_UNITS = new Set<CapacityMetricUnit>(['bytes', 'count', 'credits']);

type CurrentMetricRow = {
  metric_code: string;
  source: string;
  unit: string;
  value: number | string | null;
  limit_value: number | string | null;
  available: boolean;
  note: string | null;
  measured_at: string;
};

type HistoryMetricRow = {
  snapshot_id: number | string;
  captured_at: string;
  source: string;
  metric_code: string;
  unit: string;
  value: number | string | null;
  limit_value: number | string | null;
  available: boolean;
  note: string | null;
};

export interface CapacityDashboardService {
  load(): Promise<CapacityDashboardSnapshot>;
  captureSnapshot(): Promise<void>;
}

interface CapacityDashboardServiceOptions {
  supabaseProvider?: CapacityTelemetryProvider;
  netlifyProvider?: CapacityTelemetryProvider;
  historyLimit?: number;
}

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function parseLocalMeasurement(row: CurrentMetricRow): CapacityMetricMeasurement {
  if (row.source !== 'DATABASE_LOCAL' || !DATABASE_LOCAL_CODES.has(row.metric_code as CapacityMetricCode)) {
    throw new Error('Unexpected database-local capacity metric.');
  }
  if (!VALID_UNITS.has(row.unit as CapacityMetricUnit) || !validDate(row.measured_at)) {
    throw new Error('Invalid database-local capacity metric metadata.');
  }
  const value = numeric(row.value);
  const limit = numeric(row.limit_value);
  if (row.available && (value === null || value < 0)) throw new Error('Invalid database-local capacity value.');
  if (!row.available && value !== null) throw new Error('Unavailable capacity metric must not contain a value.');
  if (limit !== null && limit <= 0) throw new Error('Invalid database-local capacity limit.');

  return {
    code: row.metric_code as CapacityMetricCode,
    source: 'DATABASE_LOCAL',
    scope: 'PROJECT',
    unit: row.unit as CapacityMetricUnit,
    value,
    limit,
    measuredAt: row.measured_at,
    available: row.available,
    ...(row.note ? { note: row.note } : {}),
  };
}

function parseHistory(rows: HistoryMetricRow[]): CapacitySnapshot[] {
  const groups = new Map<string, CapacitySnapshot>();

  for (const row of rows) {
    if (row.source !== 'DATABASE_LOCAL' || !DATABASE_LOCAL_CODES.has(row.metric_code as CapacityMetricCode)) continue;
    if (!VALID_UNITS.has(row.unit as CapacityMetricUnit) || !validDate(row.captured_at)) continue;
    const value = numeric(row.value);
    const limit = numeric(row.limit_value);
    if (row.available && (value === null || value < 0)) continue;
    if (!row.available && value !== null) continue;
    if (limit !== null && limit <= 0) continue;

    const key = String(row.snapshot_id);
    const snapshot = groups.get(key) ?? { capturedAt: row.captured_at, metrics: [] };
    snapshot.metrics.push({
      code: row.metric_code as CapacityMetricCode,
      source: 'DATABASE_LOCAL',
      scope: 'PROJECT',
      unit: row.unit as CapacityMetricUnit,
      value,
      limit,
      measuredAt: row.captured_at,
      available: row.available,
      ...(row.note ? { note: row.note } : {}),
    });
    groups.set(key, snapshot);
  }

  return [...groups.values()].sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt));
}

function functionInvoker(client: SupabaseClient, functionName: string) {
  return async () => {
    const { data, error } = await client.functions.invoke(functionName, { body: {} });
    if (error) throw error;
    return data;
  };
}

export function createCapacityDashboardService(
  client: SupabaseClient = getSupabaseClient(),
  options: CapacityDashboardServiceOptions = {},
): CapacityDashboardService {
  const supabaseProvider = options.supabaseProvider ?? createSupabaseManagementCapacityProvider(
    functionInvoker(client, 'platform-capacity-supabase'),
  );
  const netlifyEnabled = import.meta.env.VITE_NETLIFY_CAPACITY_ENABLED === 'true';
  const netlifyProvider = options.netlifyProvider ?? (netlifyEnabled
    ? createNetlifyApiCapacityProvider(functionInvoker(client, 'platform-capacity-netlify'))
    : createDeferredNetlifyCapacityProvider());
  const historyLimit = options.historyLimit ?? 30;

  return {
    async load() {
      const [currentResult, historyResult, supabase, netlify] = await Promise.all([
        client.rpc('get_platform_capacity_current'),
        client.rpc('get_platform_capacity_history', { p_snapshot_limit: historyLimit }),
        supabaseProvider.read(),
        netlifyProvider.read(),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (historyResult.error) throw historyResult.error;

      const currentRows = (currentResult.data ?? []) as CurrentMetricRow[];
      const current = currentRows.map(parseLocalMeasurement).map((measurement) => assessCapacityMetric(measurement));
      const history = parseHistory((historyResult.data ?? []) as HistoryMetricRow[]);
      const measuredTimes = current.map((metric) => Date.parse(metric.measuredAt)).filter(Number.isFinite);
      const fetchedAt = measuredTimes.length > 0
        ? new Date(Math.max(...measuredTimes)).toISOString()
        : new Date().toISOString();

      return { fetchedAt, current, history, supabase, netlify };
    },

    async captureSnapshot() {
      const { error } = await client.rpc('capture_platform_capacity_snapshot');
      if (error) throw error;
    },
  };
}
