import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { CapacityDashboard } from './CapacityDashboard';

const measuredAt = '2026-08-22T05:30:00.000Z';

const snapshot: CapacityDashboardSnapshot = {
  fetchedAt: measuredAt,
  current: [
    { code: 'database_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 16_796_819, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'storage_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 0, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'storage_objects', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 0, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'postgres_connections', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 6, limit: 60, measuredAt, available: true, status: 'NORMAL', utilizationPercent: 10 },
    { code: 'auth_users_total', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 1, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'auth_users_30d', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 1, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
  ],
  history: [],
  supabase: {
    source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', fetchedAt: measuredAt,
    metrics: [{ code: 'supabase_monthly_active_users', source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', unit: 'count', value: null, limit: null, measuredAt, available: false }],
  },
  netlify: {
    source: 'NETLIFY_API', scope: 'ACCOUNT', fetchedAt: measuredAt,
    metrics: [{ code: 'netlify_bandwidth_bytes', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'bytes', value: null, limit: null, measuredAt, available: false }],
  },
};

describe('CapacityDashboard', () => {
  it('renders only real local telemetry and honest unavailable/unconfigured states', () => {
    render(<CapacityDashboard snapshot={snapshot} onRefresh={vi.fn()} onCaptureSnapshot={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Platform overview', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Supabase connected')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supabase project data' })).toBeInTheDocument();
    expect(screen.getByText('Database size')).toBeInTheDocument();
    expect(screen.getByText('Postgres connections')).toBeInTheDocument();
    expect(screen.getAllByText('Unconfigured').length).toBeGreaterThan(0);
    expect(screen.getByText('Management usage unavailable')).toBeInTheDocument();
    expect(screen.getByText('Setup deferred')).toBeInTheDocument();
    expect(screen.getByText('No snapshots yet')).toBeInTheDocument();
    expect(screen.queryByText(/Healthy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/500 MB/i)).not.toBeInTheDocument();
  });

  it('wires refresh and snapshot actions without fake controls', () => {
    const onRefresh = vi.fn();
    const onCapture = vi.fn();
    render(<CapacityDashboard snapshot={snapshot} onRefresh={onRefresh} onCaptureSnapshot={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record snapshot' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onCapture).toHaveBeenCalledOnce();
  });
});
