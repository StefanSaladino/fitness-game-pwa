import { describe, expect, it } from 'vitest';
import { createSupabaseManagementCapacityProvider } from './supabaseManagementProvider';

const fetchedAt = '2026-08-22T04:30:00.000Z';

function unavailableEnvelope() {
  return {
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    fetchedAt,
    capability: {
      managementApiConfigured: true,
      organizationVerified: true,
      entitlementsReachable: true,
      billingUsageApi: 'UNAVAILABLE',
    },
    metrics: [
      {
        code: 'supabase_monthly_active_users',
        source: 'SUPABASE_MANAGEMENT',
        scope: 'ORGANIZATION',
        unit: 'count',
        value: null,
        limit: null,
        measuredAt: fetchedAt,
        available: false,
        note: 'No documented provider billing-cycle usage API.',
      },
      {
        code: 'supabase_egress_bytes',
        source: 'SUPABASE_MANAGEMENT',
        scope: 'ORGANIZATION',
        unit: 'bytes',
        value: null,
        limit: null,
        measuredAt: fetchedAt,
        available: false,
      },
    ],
  };
}

describe('Supabase management capacity provider', () => {
  it('does not turn provider failure into zero and accepts an organization-scoped fail-closed response', async () => {
    const result = await createSupabaseManagementCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['supabase_monthly_active_users', 'supabase_egress_bytes'],
    });

    expect(result).toMatchObject({ source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', fetchedAt });
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics.every((metric) => metric.available === false && metric.value === null && metric.limit === null)).toBe(true);
  });

  it('filters out non-Supabase metric requests instead of querying unrelated sources', async () => {
    const result = await createSupabaseManagementCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['database_bytes', 'netlify_requests'],
    });
    expect(result.metrics).toEqual([]);
  });

  it('fills a missing requested provider metric as unavailable rather than zero', async () => {
    const result = await createSupabaseManagementCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['supabase_cached_egress_bytes'],
    });
    expect(result.metrics[0]).toMatchObject({
      code: 'supabase_cached_egress_bytes',
      available: false,
      value: null,
      limit: null,
      scope: 'ORGANIZATION',
    });
  });

  it('fails closed when the Edge/provider invocation throws', async () => {
    const result = await createSupabaseManagementCapacityProvider(async () => {
      throw new Error('network');
    }).read({ metricCodes: ['supabase_realtime_messages'] });

    expect(result.metrics[0]).toMatchObject({ available: false, value: null, limit: null });
  });

  it('rejects malformed or wrong-scope provider payloads', async () => {
    const bad = unavailableEnvelope();
    bad.scope = 'PROJECT';
    const result = await createSupabaseManagementCapacityProvider(async () => bad).read({
      metricCodes: ['supabase_monthly_active_users'],
    });
    expect(result.metrics[0]).toMatchObject({ available: false, value: null });
  });
});
