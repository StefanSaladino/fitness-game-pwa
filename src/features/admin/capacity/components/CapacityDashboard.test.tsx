import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CapacityDashboardSnapshot } from '../dashboardModel';
import { CapacityDashboard } from './CapacityDashboard';

const measuredAt = '2026-08-30T16:30:00.000Z';

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
  netlify: {
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
      { code: 'netlify_bandwidth_bytes', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'bytes', value: null, limit: null, measuredAt, available: false, note: 'Usage Insights totals are not exposed.' },
      { code: 'netlify_requests', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'count', value: null, limit: null, measuredAt, available: false, note: 'Usage Insights totals are not exposed.' },
      { code: 'netlify_build_usage', source: 'NETLIFY_API', scope: 'ACCOUNT', unit: 'credits', value: null, limit: null, measuredAt, available: false, note: 'Usage Insights totals are not exposed.' },
    ],
  },
};

describe('CapacityDashboard', () => {
  it('renders trustworthy database metrics and explicit Netlify provider boundaries', () => {
    render(<CapacityDashboard snapshot={snapshot} onRefresh={vi.fn()} onCaptureSnapshot={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Measured capacity' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);

    expect(screen.getByText('Database size')).toBeInTheDocument();
    expect(screen.getByText('Limit 500 MB')).toBeInTheDocument();
    expect(screen.getByLabelText(/Database size utilization/i)).toBeInTheDocument();

    expect(screen.getByText('Postgres connections')).toBeInTheDocument();
    expect(screen.getByText('Limit 60')).toBeInTheDocument();

    const storageCard = screen.getByText('Project storage').closest('article');
    expect(storageCard).not.toBeNull();
    expect(within(storageCard!).getByText('Measured')).toBeInTheDocument();
    expect(within(storageCard!).queryByLabelText(/utilization/i)).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Netlify account telemetry' })).toBeInTheDocument();
    expect(screen.getByText('Account and project verified')).toBeInTheDocument();
    expect(screen.getByText('Bandwidth')).toBeInTheDocument();
    expect(screen.getByText('Web requests')).toBeInTheDocument();
    expect(screen.getByText('Build / credit usage')).toBeInTheDocument();
    expect(screen.getAllByText('Not exposed')).toHaveLength(3);
    expect(screen.getByText('Provider quota boundaries')).toBeInTheDocument();
  });

  it('shows provider configuration failure without inventing zero usage', () => {
    const unconfigured: CapacityDashboardSnapshot = {
      ...snapshot,
      netlify: {
        ...snapshot.netlify,
        capability: {
          providerReachable: true,
          apiConfigured: false,
          accountVerified: false,
          siteConfigured: false,
          siteVerified: false,
          billingUsageApi: 'UNAVAILABLE',
        },
      },
    };

    render(<CapacityDashboard snapshot={unconfigured} onRefresh={vi.fn()} onCaptureSnapshot={vi.fn()} />);
    expect(screen.getByText('Provider secrets not configured')).toBeInTheDocument();
    expect(screen.queryByText('0 credits')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not exposed')).toHaveLength(3);
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
