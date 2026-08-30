import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createCapacityDashboardService } from './capacityDashboardService';

const measuredAt = '2026-08-30T20:30:00.000Z';

function fakeClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'get_platform_capacity_current') {
      return {
        error: null,
        data: [
          { metric_code: 'database_bytes', source: 'DATABASE_LOCAL', unit: 'bytes', value: '22736019', limit_value: '524288000', available: true, note: 'Database size', measured_at: measuredAt },
          { metric_code: 'storage_bytes', source: 'DATABASE_LOCAL', unit: 'bytes', value: '109533', limit_value: null, available: true, note: 'Storage', measured_at: measuredAt },
          { metric_code: 'storage_objects', source: 'DATABASE_LOCAL', unit: 'count', value: 1, limit_value: null, available: true, note: 'Storage objects', measured_at: measuredAt },
          { metric_code: 'postgres_connections', source: 'DATABASE_LOCAL', unit: 'count', value: 11, limit_value: 60, available: true, note: 'Connections', measured_at: measuredAt },
          { metric_code: 'auth_users_total', source: 'DATABASE_LOCAL', unit: 'count', value: 3, limit_value: null, available: true, note: 'Auth users', measured_at: measuredAt },
          { metric_code: 'auth_users_30d', source: 'DATABASE_LOCAL', unit: 'count', value: 3, limit_value: null, available: true, note: 'Recent sign-ins', measured_at: measuredAt },
        ],
      };
    }
    if (name === 'get_platform_capacity_history') {
      return { error: null, data: [] };
    }
    if (name === 'capture_platform_capacity_snapshot') {
      return { error: null, data: [{ snapshot_id: 1, captured_at: measuredAt }] };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });

  return { rpc, functions: { invoke: vi.fn() } } as unknown as SupabaseClient;
}

describe('capacity dashboard service', () => {
  it('does not call the unavailable Supabase billing provider', async () => {
    const client = fakeClient();
    const service = createCapacityDashboardService(client);
    const snapshot = await service.load();

    expect(snapshot.current).toHaveLength(6);
    expect(snapshot.supabase.metrics).toEqual([]);
    expect(client.functions.invoke).not.toHaveBeenCalledWith('platform-capacity-supabase', expect.anything());
  });

  it('captures a database-local snapshot', async () => {
    const client = fakeClient();
    const service = createCapacityDashboardService(client);
    await service.captureSnapshot();
    expect(client.rpc).toHaveBeenCalledWith('capture_platform_capacity_snapshot');
  });

  it('keeps Netlify deferred until its later provider phase', async () => {
    vi.stubEnv('VITE_NETLIFY_CAPACITY_ENABLED', 'false');
    const client = fakeClient();
    const service = createCapacityDashboardService(client);
    const snapshot = await service.load();

    expect(snapshot.netlify.metrics.every((metric) => !metric.available)).toBe(true);
    expect(client.functions.invoke).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
