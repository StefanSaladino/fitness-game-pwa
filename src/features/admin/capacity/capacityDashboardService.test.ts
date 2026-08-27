import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { CapacityTelemetryProvider } from './provider';
import { createCapacityDashboardService } from './capacityDashboardService';

const measuredAt = '2026-08-22T05:30:00.000Z';

function provider(source: 'SUPABASE_MANAGEMENT' | 'NETLIFY_API'): CapacityTelemetryProvider {
  return {
    source,
    read: async () => ({ source, fetchedAt: measuredAt, metrics: [] }),
  };
}

function fakeClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'get_platform_capacity_current') {
      return {
        error: null,
        data: [
          { metric_code: 'database_bytes', source: 'DATABASE_LOCAL', unit: 'bytes', value: '16796819', limit_value: null, available: true, note: 'Database size', measured_at: measuredAt },
          { metric_code: 'postgres_connections', source: 'DATABASE_LOCAL', unit: 'count', value: 6, limit_value: 60, available: true, note: 'Connections', measured_at: measuredAt },
        ],
      };
    }
    if (name === 'get_platform_capacity_history') {
      return {
        error: null,
        data: [
          { snapshot_id: 2, captured_at: measuredAt, source: 'DATABASE_LOCAL', metric_code: 'database_bytes', unit: 'bytes', value: '16796819', limit_value: null, available: true, note: null },
          { snapshot_id: 1, captured_at: '2026-08-21T05:30:00.000Z', source: 'DATABASE_LOCAL', metric_code: 'database_bytes', unit: 'bytes', value: '16000000', limit_value: null, available: true, note: null },
        ],
      };
    }
    if (name === 'capture_platform_capacity_snapshot') return { error: null, data: [{ snapshot_id: 3, captured_at: measuredAt }] };
    throw new Error(`Unexpected RPC ${name}`);
  });

  return { rpc, functions: { invoke: vi.fn() } } as unknown as SupabaseClient;
}

describe('capacity dashboard service', () => {
  it('loads authoritative local telemetry, assessments, history, and provider boundaries', async () => {
    const service = createCapacityDashboardService(fakeClient(), {
      supabaseProvider: provider('SUPABASE_MANAGEMENT'),
      netlifyProvider: provider('NETLIFY_API'),
    });
    const snapshot = await service.load();

    expect(snapshot.current.find((metric) => metric.code === 'database_bytes')).toMatchObject({
      source: 'DATABASE_LOCAL', scope: 'PROJECT', status: 'UNCONFIGURED', limit: null,
    });
    expect(snapshot.current.find((metric) => metric.code === 'postgres_connections')).toMatchObject({
      status: 'NORMAL', value: 6, limit: 60,
    });
    expect(snapshot.history).toHaveLength(2);
    expect(snapshot.supabase.source).toBe('SUPABASE_MANAGEMENT');
    expect(snapshot.netlify.source).toBe('NETLIFY_API');
  });

  it('captures a real database-local snapshot through the guarded RPC', async () => {
    const client = fakeClient();
    const service = createCapacityDashboardService(client, {
      supabaseProvider: provider('SUPABASE_MANAGEMENT'),
      netlifyProvider: provider('NETLIFY_API'),
    });
    await service.captureSnapshot();
    expect(client.rpc).toHaveBeenCalledWith('capture_platform_capacity_snapshot');
  });

  it('loads Supabase project data without calling Netlify until its adapter is enabled', async () => {
    vi.stubEnv('VITE_NETLIFY_CAPACITY_ENABLED', 'false');
    const client = fakeClient();
    const invoke = vi.spyOn(client.functions, 'invoke');
    const service = createCapacityDashboardService(client, {
      supabaseProvider: provider('SUPABASE_MANAGEMENT'),
    });

    const snapshot = await service.load();

    expect(client.rpc).toHaveBeenCalledWith('get_platform_capacity_current');
    expect(snapshot.current.length).toBeGreaterThan(0);
    expect(snapshot.netlify.metrics.every((metric) => !metric.available)).toBe(true);
    expect(invoke).not.toHaveBeenCalledWith('platform-capacity-netlify', expect.anything());
    vi.unstubAllEnvs();
  });
});
