import { describe, expect, it } from 'vitest';
import { createNetlifyApiCapacityProvider } from './netlifyApiProvider';

const fetchedAt = '2026-08-22T05:00:00.000Z';

function unavailableEnvelope() {
  return {
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    fetchedAt,
    capability: {
      providerReachable: true,
      apiConfigured: true,
      accountVerified: true,
      siteConfigured: true,
      siteVerified: true,
      billingUsageApi: 'UNAVAILABLE',
    },
    metrics: [
      {
        code: 'netlify_bandwidth_bytes',
        source: 'NETLIFY_API',
        scope: 'ACCOUNT',
        unit: 'bytes',
        value: null,
        limit: null,
        measuredAt: fetchedAt,
        available: false,
        note: 'No documented provider account-usage API.',
      },
      {
        code: 'netlify_requests',
        source: 'NETLIFY_API',
        scope: 'ACCOUNT',
        unit: 'count',
        value: null,
        limit: null,
        measuredAt: fetchedAt,
        available: false,
      },
    ],
  };
}

describe('Netlify API capacity provider', () => {
  it('accepts an account-scoped fail-closed provider response without converting unavailable values to zero', async () => {
    const result = await createNetlifyApiCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['netlify_bandwidth_bytes', 'netlify_requests'],
    });

    expect(result).toMatchObject({
      source: 'NETLIFY_API',
      scope: 'ACCOUNT',
      fetchedAt,
      capability: { providerReachable: true, accountVerified: true, siteVerified: true },
    });
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics.every((metric) => metric.available === false && metric.value === null && metric.limit === null)).toBe(true);
  });

  it('filters non-Netlify metric requests instead of querying unrelated providers', async () => {
    const result = await createNetlifyApiCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['database_bytes', 'supabase_egress_bytes'],
    });
    expect(result.metrics).toEqual([]);
  });

  it('fills a missing requested provider metric as unavailable rather than zero', async () => {
    const result = await createNetlifyApiCapacityProvider(async () => unavailableEnvelope()).read({
      metricCodes: ['netlify_build_usage'],
    });
    expect(result.metrics[0]).toMatchObject({
      code: 'netlify_build_usage',
      unit: 'credits',
      available: false,
      value: null,
      limit: null,
      scope: 'ACCOUNT',
    });
  });

  it('fails closed when the Edge/provider invocation throws', async () => {
    const result = await createNetlifyApiCapacityProvider(async () => {
      throw new Error('network');
    }).read({ metricCodes: ['netlify_requests'] });

    expect(result).toMatchObject({ capability: { providerReachable: false, apiConfigured: false } });
    expect(result.metrics[0]).toMatchObject({ available: false, value: null, limit: null });
  });

  it('rejects malformed or wrong-scope provider payloads', async () => {
    const bad = unavailableEnvelope();
    bad.scope = 'PROJECT';
    const result = await createNetlifyApiCapacityProvider(async () => bad).read({
      metricCodes: ['netlify_bandwidth_bytes'],
    });
    expect(result).toMatchObject({ capability: { providerReachable: false } });
    expect(result.metrics[0]).toMatchObject({ available: false, value: null });
  });
});
