import type {
  CapacityMetricCode,
  CapacityMetricMeasurement,
} from './model';
import type {
  CapacityTelemetryProvider,
  CapacityTelemetryRequest,
  CapacityTelemetryResult,
} from './provider';

export const SUPABASE_MANAGEMENT_METRIC_CODES = [
  'supabase_monthly_active_users',
  'supabase_storage_bytes',
  'supabase_egress_bytes',
  'supabase_cached_egress_bytes',
  'supabase_edge_function_invocations',
  'supabase_realtime_messages',
  'supabase_realtime_peak_connections',
] as const satisfies readonly CapacityMetricCode[];

type SupabaseManagementMetricCode = typeof SUPABASE_MANAGEMENT_METRIC_CODES[number];

export interface SupabaseManagementCapability {
  managementApiConfigured: boolean;
  organizationVerified: boolean;
  entitlementsReachable: boolean;
  billingUsageApi: 'UNAVAILABLE';
}

export interface SupabaseManagementEnvelope extends CapacityTelemetryResult {
  source: 'SUPABASE_MANAGEMENT';
  scope: 'ORGANIZATION';
  capability: SupabaseManagementCapability;
}

export type SupabaseManagementInvoker = () => Promise<unknown>;

const CODE_SET = new Set<string>(SUPABASE_MANAGEMENT_METRIC_CODES);

const UNIT_BY_CODE: Record<SupabaseManagementMetricCode, CapacityMetricMeasurement['unit']> = {
  supabase_monthly_active_users: 'count',
  supabase_storage_bytes: 'bytes',
  supabase_egress_bytes: 'bytes',
  supabase_cached_egress_bytes: 'bytes',
  supabase_edge_function_invocations: 'count',
  supabase_realtime_messages: 'count',
  supabase_realtime_peak_connections: 'count',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function requestedCodes(request?: CapacityTelemetryRequest): SupabaseManagementMetricCode[] {
  if (!request?.metricCodes?.length) return [...SUPABASE_MANAGEMENT_METRIC_CODES];
  return request.metricCodes.filter((code): code is SupabaseManagementMetricCode => CODE_SET.has(code));
}

function unavailableMetric(code: SupabaseManagementMetricCode, measuredAt: string, note: string): CapacityMetricMeasurement {
  return {
    code,
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    unit: UNIT_BY_CODE[code],
    value: null,
    limit: null,
    measuredAt,
    available: false,
    note,
  };
}

function unavailableResult(codes: SupabaseManagementMetricCode[], note: string): SupabaseManagementEnvelope {
  const fetchedAt = new Date().toISOString();
  return {
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    fetchedAt,
    metrics: codes.map((code) => unavailableMetric(code, fetchedAt, note)),
    capability: {
      managementApiConfigured: false,
      organizationVerified: false,
      entitlementsReachable: false,
      billingUsageApi: 'UNAVAILABLE',
    },
  };
}

function parseMetric(raw: unknown): CapacityMetricMeasurement | null {
  if (!isRecord(raw)) return null;
  const code = raw.code;
  if (typeof code !== 'string' || !CODE_SET.has(code)) return null;
  const typedCode = code as SupabaseManagementMetricCode;
  if (raw.source !== 'SUPABASE_MANAGEMENT' || raw.scope !== 'ORGANIZATION') return null;
  if (raw.unit !== UNIT_BY_CODE[typedCode] || !isIsoDate(raw.measuredAt) || typeof raw.available !== 'boolean') return null;
  if (raw.limit !== null && !isPositive(raw.limit)) return null;

  if (raw.available) {
    if (!isFiniteNonNegative(raw.value)) return null;
  } else if (raw.value !== null) {
    return null;
  }

  return {
    code: typedCode,
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    unit: UNIT_BY_CODE[typedCode],
    value: raw.value as number | null,
    limit: raw.limit === null ? null : raw.limit as number,
    measuredAt: raw.measuredAt,
    available: raw.available,
    ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
  };
}

function parseEnvelope(raw: unknown, codes: SupabaseManagementMetricCode[]): SupabaseManagementEnvelope | null {
  if (!isRecord(raw) || raw.source !== 'SUPABASE_MANAGEMENT' || raw.scope !== 'ORGANIZATION' || !isIsoDate(raw.fetchedAt)) {
    return null;
  }
  if (!Array.isArray(raw.metrics) || !isRecord(raw.capability)) return null;
  if (raw.capability.billingUsageApi !== 'UNAVAILABLE') return null;

  const parsed = raw.metrics.map(parseMetric);
  if (parsed.some((metric) => metric === null)) return null;
  const byCode = new Map(parsed.map((metric) => [metric!.code, metric!]));
  const normalized = codes.map((code) => byCode.get(code) ?? unavailableMetric(
    code,
    raw.fetchedAt as string,
    'Supabase provider did not return this metric; treating it as unavailable.',
  ));

  return {
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    fetchedAt: raw.fetchedAt,
    metrics: normalized,
    capability: {
      managementApiConfigured: raw.capability.managementApiConfigured === true,
      organizationVerified: raw.capability.organizationVerified === true,
      entitlementsReachable: raw.capability.entitlementsReachable === true,
      billingUsageApi: 'UNAVAILABLE',
    },
  };
}

export function createSupabaseManagementCapacityProvider(
  invoke: SupabaseManagementInvoker,
): CapacityTelemetryProvider {
  return {
    source: 'SUPABASE_MANAGEMENT',
    async read(request?: CapacityTelemetryRequest): Promise<CapacityTelemetryResult> {
      const codes = requestedCodes(request);
      if (codes.length === 0) {
        return {
          source: 'SUPABASE_MANAGEMENT',
          scope: 'ORGANIZATION',
          fetchedAt: new Date().toISOString(),
          metrics: [],
        };
      }

      try {
        const envelope = parseEnvelope(await invoke(), codes);
        if (envelope) return envelope;
        return unavailableResult(codes, 'Supabase management telemetry returned an invalid or unsupported payload.');
      } catch {
        return unavailableResult(codes, 'Supabase management telemetry is currently unavailable.');
      }
    },
  };
}
