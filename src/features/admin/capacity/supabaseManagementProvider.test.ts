import { describe, expect, it } from 'vitest';
import { createSupabaseManagementCapacityProvider } from './supabaseManagementProvider';

const fetchedAt = '2026-08-29T19:30:00.000Z';

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
        limit: 50_000,
        measuredAt: fetchedAt,
        available: false,
        note: 'Usage unavailable; verified Free-plan organization allowance is configured server-side.',
      },
      {
        code: 'supabase_edge_function_invocations',
        source: 'SUPABASE_MANAGEMENT',
        scope: 'ORGANIZATION',
        unit: 'count',
        value: null,
        limit: 500_000,
        measuredAt: fetchedAt,
        available: false,
      },
    ],
  };
}

describe('Supabase management capacity provider', () => {
  it('preserves known server-owned limits while unavailable usage remains null', async () => {
    const result = await createSupabaseManagementCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['supabase_monthly_active_users', 'supabase_edge_function_invocations'],
    });

    expect(result).toMatchObject({ source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', fetchedAt });
    expect(result.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'supabase_monthly_active_users', available: false, value: null, limit: 50_000 }),
      expect.objectContaining({ code: 'supabase_edge_function_invocations', available: false, value: null, limit: 500_000 }),
    ]));
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

  it('rejects malformed limits even when provider usage is unavailable', async () => {
    const bad = unavailableEnvelope();
    bad.metrics[0].limit = -1;
    const result = await createSupabaseManagementCapacityProvider(async () => bad).read({
      metricCodes: ['supabase_monthly_active_users'],
    });
    expect(result.metrics[0]).toMatchObject({ available: false, value: null, limit: null });
  });
});
