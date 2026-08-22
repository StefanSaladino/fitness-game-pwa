import type {
  CapacityMetricCode,
  CapacityMetricMeasurement,
} from './model';
import type {
  CapacityTelemetryProvider,
  CapacityTelemetryRequest,
  CapacityTelemetryResult,
} from './provider';

export const NETLIFY_API_METRIC_CODES = [
  'netlify_bandwidth_bytes',
  'netlify_requests',
  'netlify_build_usage',
] as const satisfies readonly CapacityMetricCode[];

type NetlifyApiMetricCode = typeof NETLIFY_API_METRIC_CODES[number];

export interface NetlifyApiCapability {
  apiConfigured: boolean;
  accountVerified: boolean;
  siteConfigured: boolean;
  siteVerified: boolean;
  billingUsageApi: 'UNAVAILABLE';
}

export interface NetlifyApiEnvelope extends CapacityTelemetryResult {
  source: 'NETLIFY_API';
  scope: 'ACCOUNT';
  capability: NetlifyApiCapability;
}

export type NetlifyApiInvoker = () => Promise<unknown>;

const CODE_SET = new Set<string>(NETLIFY_API_METRIC_CODES);

const UNIT_BY_CODE: Record<NetlifyApiMetricCode, CapacityMetricMeasurement['unit']> = {
  netlify_bandwidth_bytes: 'bytes',
  netlify_requests: 'count',
  netlify_build_usage: 'credits',
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

function requestedCodes(request?: CapacityTelemetryRequest): NetlifyApiMetricCode[] {
  if (!request?.metricCodes?.length) return [...NETLIFY_API_METRIC_CODES];
  return request.metricCodes.filter((code): code is NetlifyApiMetricCode => CODE_SET.has(code));
}

function unavailableMetric(code: NetlifyApiMetricCode, measuredAt: string, note: string): CapacityMetricMeasurement {
  return {
    code,
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    unit: UNIT_BY_CODE[code],
    value: null,
    limit: null,
    measuredAt,
    available: false,
    note,
  };
}

function unavailableResult(codes: NetlifyApiMetricCode[], note: string): NetlifyApiEnvelope {
  const fetchedAt = new Date().toISOString();
  return {
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    fetchedAt,
    metrics: codes.map((code) => unavailableMetric(code, fetchedAt, note)),
    capability: {
      apiConfigured: false,
      accountVerified: false,
      siteConfigured: false,
      siteVerified: false,
      billingUsageApi: 'UNAVAILABLE',
    },
  };
}

function parseMetric(raw: unknown): CapacityMetricMeasurement | null {
  if (!isRecord(raw)) return null;
  const code = raw.code;
  if (typeof code !== 'string' || !CODE_SET.has(code)) return null;
  const typedCode = code as NetlifyApiMetricCode;
  if (raw.source !== 'NETLIFY_API' || raw.scope !== 'ACCOUNT') return null;
  if (raw.unit !== UNIT_BY_CODE[typedCode] || !isIsoDate(raw.measuredAt) || typeof raw.available !== 'boolean') return null;

  if (raw.available) {
    if (!isFiniteNonNegative(raw.value)) return null;
    if (raw.limit !== null && !isPositive(raw.limit)) return null;
  } else if (raw.value !== null) {
    return null;
  }

  return {
    code: typedCode,
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    unit: UNIT_BY_CODE[typedCode],
    value: raw.value as number | null,
    limit: raw.limit === null ? null : raw.limit as number,
    measuredAt: raw.measuredAt,
    available: raw.available,
    ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
  };
}

function parseEnvelope(raw: unknown, codes: NetlifyApiMetricCode[]): NetlifyApiEnvelope | null {
  if (!isRecord(raw) || raw.source !== 'NETLIFY_API' || raw.scope !== 'ACCOUNT' || !isIsoDate(raw.fetchedAt)) {
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
    'Netlify provider did not return this metric; treating it as unavailable.',
  ));

  return {
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    fetchedAt: raw.fetchedAt,
    metrics: normalized,
    capability: {
      apiConfigured: raw.capability.apiConfigured === true,
      accountVerified: raw.capability.accountVerified === true,
      siteConfigured: raw.capability.siteConfigured === true,
      siteVerified: raw.capability.siteVerified === true,
      billingUsageApi: 'UNAVAILABLE',
    },
  };
}

export function createNetlifyApiCapacityProvider(
  invoke: NetlifyApiInvoker,
): CapacityTelemetryProvider {
  return {
    source: 'NETLIFY_API',
    async read(request?: CapacityTelemetryRequest): Promise<CapacityTelemetryResult> {
      const codes = requestedCodes(request);
      if (codes.length === 0) {
        return {
          source: 'NETLIFY_API',
          scope: 'ACCOUNT',
          fetchedAt: new Date().toISOString(),
          metrics: [],
        };
      }

      try {
        const envelope = parseEnvelope(await invoke(), codes);
        if (envelope) return envelope;
        return unavailableResult(codes, 'Netlify capacity telemetry returned an invalid or unsupported payload.');
      } catch {
        return unavailableResult(codes, 'Netlify capacity telemetry is currently unavailable.');
      }
    },
  };
}
