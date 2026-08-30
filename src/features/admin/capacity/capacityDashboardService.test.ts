import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createCapacityDashboardService } from './capacityDashboardService';

const measuredAt = '2026-08-30T16:30:00.000Z';

function fakeClient() {
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

  return {
    rpc,
    functions: {
      invoke: vi.fn(() => {
        throw new Error('Provider functions must not be invoked by the Capacity page');
      }),
    },
  } as unknown as SupabaseClient;
}

describe('capacity dashboard service', () => {
  it('loads authoritative database-local telemetry without provider network calls', async () => {
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
    expect(snapshot.netlify.metrics).toEqual([]);
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it('captures database-local snapshots through the guarded RPC', async () => {
    const client = fakeClient();
    await createCapacityDashboardService(client).captureSnapshot();
    expect(client.rpc).toHaveBeenCalledWith('capture_platform_capacity_snapshot');
  });
});
