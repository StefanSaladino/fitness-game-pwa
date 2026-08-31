import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createCapacityDashboardService } from './capacityDashboardService';

const measuredAt = '2026-08-30T16:30:00.000Z';

function netlifyEnvelope() {
  return {
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    fetchedAt: measuredAt,
    capability: {
      providerReachable: true,
      apiConfigured: true,
      accountVerified: true,
      siteConfigured: true,
      siteVerified: true,
      billingUsageApi: 'UNAVAILABLE',
    },
    metrics: [
      { code: 'netlify_bandwidth_bytes', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'bytes', value: null, limit: null, measuredAt, available: false, note: 'Authoritative billing usage API unavailable.' },
      { code: 'netlify_requests', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'count', value: null, limit: null, measuredAt, available: false, note: 'Authoritative billing usage API unavailable.' },
      { code: 'netlify_build_usage', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'credits', value: null, limit: null, measuredAt, available: false, note: 'Authoritative billing usage API unavailable.' },
    ],
  };
}

function fakeClient(options: { providerError?: boolean } = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'get_platform_capacity_current') {
      return {
        error: null,
        data: [
          { metric_code: 'database_bytes', source: 'DATABASE_LOCAL', unit: 'bytes', value: '22736019', limit_value: '524288000', available: true, note: 'Database size', measured_at: measuredAt },
          { metric_code: 'storage_bytes', source: 'DATABASE_LOCAL', unit: 'bytes', value: '109533', limit_value: null, available: true, note: 'Project storage', measured_at: measuredAt },
          { metric_code: 'postgres_connections', source: 'DATABASE_LOCAL', unit: 'count', value: 11, limit_value: 60, available: true, note: 'Connections', measured_at: measuredAt },
        ],
      };
    }
    if (name === 'get_platform_capacity_history') return { error: null, data: [] };
    if (name === 'capture_platform_capacity_snapshot') {
      return { error: null, data: [{ snapshot_id: 3, captured_at: measuredAt }] };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });

  const invoke = vi.fn(async (name: string) => {
    if (name !== 'platform-capacity-netlify') throw new Error(`Unexpected function ${name}`);
    if (options.providerError) return { data: null, error: new Error('provider unavailable') };
    return { data: netlifyEnvelope(), error: null };
  });

  return {
    rpc,
    functions: { invoke },
  } as unknown as SupabaseClient;
}

describe('capacity dashboard service', () => {
  it('loads database-local telemetry and the secured Netlify provider together', async () => {
    const client = fakeClient();
    const snapshot = await createCapacityDashboardService(client).load();

    expect(snapshot.current.find((metric) => metric.code === 'database_bytes')).toMatchObject({
      status: 'NORMAL',
      limit: 524288000,
    });
    expect(snapshot.current.find((metric) => metric.code === 'postgres_connections')).toMatchObject({
      value: 11,
      limit: 60,
    });
    expect(snapshot.supabase.metrics).toEqual([]);
    expect(snapshot.netlify.metrics).toHaveLength(3);
    expect(snapshot.netlify.metrics.every((metric) => metric.available === false && metric.value === null)).toBe(true);
    expect(snapshot.netlify.capability).toMatchObject({
      providerReachable: true,
      accountVerified: true,
      siteVerified: true,
      billingUsageApi: 'UNAVAILABLE',
    });
    expect(client.functions.invoke).toHaveBeenCalledWith('platform-capacity-netlify', { body: {} });
  });

  it('fails the Netlify provider closed without hiding database-local telemetry', async () => {
    const client = fakeClient({ providerError: true });
    const snapshot = await createCapacityDashboardService(client).load();

    expect(snapshot.current).toHaveLength(3);
    expect(snapshot.netlify.metrics).toHaveLength(3);
    expect(snapshot.netlify.metrics.every((metric) => metric.available === false && metric.value === null && metric.limit === null)).toBe(true);
    expect(snapshot.netlify.capability).toMatchObject({ providerReachable: false, apiConfigured: false });
  });

  it('captures database-local snapshots through the guarded RPC', async () => {
    const client = fakeClient();
    await createCapacityDashboardService(client).captureSnapshot();
    expect(client.rpc).toHaveBeenCalledWith('capture_platform_capacity_snapshot');
  });
});
