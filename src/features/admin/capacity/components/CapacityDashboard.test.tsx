import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { CapacityDashboard } from './CapacityDashboard';

const measuredAt = '2026-08-30T20:30:00.000Z';

const snapshot: CapacityDashboardSnapshot = {
  fetchedAt: measuredAt,
  current: [
    { code: 'database_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 22_736_019, limit: 524_288_000, measuredAt, available: true, status: 'NORMAL', utilizationPercent: 4.34 },
    { code: 'storage_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 109_533, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'storage_objects', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 1, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'postgres_connections', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 11, limit: 60, measuredAt, available: true, status: 'NORMAL', utilizationPercent: 18.33 },
    { code: 'auth_users_total', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 3, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'auth_users_30d', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 3, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
  ],
  history: [],
  supabase: { source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', fetchedAt: measuredAt, metrics: [] },
  netlify: { source: 'NETLIFY_API', scope: 'ACCOUNT', fetchedAt: measuredAt, metrics: [] },
};

describe('CapacityDashboard', () => {
  it('shows only measurable, useful capacity signals', () => {
    render(<CapacityDashboard snapshot={snapshot} onRefresh={vi.fn()} onCaptureSnapshot={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Capacity overview', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supabase project capacity' })).toBeInTheDocument();

    expect(screen.getByText('Database size')).toBeInTheDocument();
    expect(screen.getByText('Limit 500 MB')).toBeInTheDocument();
    expect(screen.getByText('Postgres connections')).toBeInTheDocument();
    expect(screen.getByText('Limit 60')).toBeInTheDocument();
    expect(screen.getByText('Current project storage')).toBeInTheDocument();
    expect(screen.getByText(/Free plan includes 1 GB organization Storage/)).toBeInTheDocument();

    expect(screen.queryByText('Storage objects')).not.toBeInTheDocument();
    expect(screen.queryByText('Auth users')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent sign-ins')).not.toBeInTheDocument();
    expect(screen.queryByText('Monthly active users')).not.toBeInTheDocument();
    expect(screen.queryByText('Uncached egress')).not.toBeInTheDocument();
    expect(screen.queryByText('Edge Function invocations')).not.toBeInTheDocument();
    expect(screen.queryByText('Realtime messages')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Intentionally omitted' })).toBeInTheDocument();
  });

  it('wires refresh and snapshot actions', () => {
    const onRefresh = vi.fn();
    const onCapture = vi.fn();
    render(<CapacityDashboard snapshot={snapshot} onRefresh={onRefresh} onCaptureSnapshot={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record snapshot' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onCapture).toHaveBeenCalledOnce();
  });
});
