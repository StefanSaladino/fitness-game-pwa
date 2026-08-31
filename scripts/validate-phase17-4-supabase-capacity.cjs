const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17.4 validation failed: ${message}`);
};

const migration = read('supabase/migrations/20260829194000_phase17_4_supabase_free_capacity.sql');
const dashboard = read('src/features/admin/capacity/components/CapacityDashboard.tsx');
const service = read('src/features/admin/capacity/capacityDashboardService.ts');

ok(migration.includes('524288000'), 'database allowance must be 500 MB');
ok(migration.includes('Verified 2026-08-30'), 'database allowance must record verification date');

for (const label of ['Database size', 'Postgres connections', 'Project storage']) {
  ok(dashboard.includes(label), `dashboard missing ${label}`);
}

for (const removed of ['Storage objects', 'Auth users', 'Recent sign-ins', 'Monthly active users', 'Usage unavailable', 'Provider status']) {
  ok(!dashboard.includes(`>${removed}<`) && !dashboard.includes(`'${removed}'`), `dashboard still renders ${removed}`);
}

ok(dashboard.includes('Provider quota boundaries'), 'dashboard must explain provider quota boundaries without inventing usage');
ok(dashboard.includes('Supabase organization-level'), 'dashboard must keep organization-level Supabase usage explicitly out of project utilization');
ok(service.includes("client.rpc('get_platform_capacity_current')"), 'Capacity page must keep the guarded database-local current RPC');
ok(service.includes("client.rpc('get_platform_capacity_history'"), 'Capacity page must keep the guarded database-local history RPC');
ok(!service.includes('VITE_NETLIFY_CAPACITY_ENABLED'), 'Capacity page must not revive the retired browser Netlify capacity switch');

console.log('Phase 17.4 measurable-capacity validation passed: the three authoritative database-local signals remain intact while later provider phases may add separate secured telemetry.');
