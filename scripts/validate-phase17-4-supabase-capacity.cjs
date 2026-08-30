const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17.4 validation failed: ${message}`);
};

const migration = read('supabase/migrations/20260829194000_phase17_4_supabase_free_capacity.sql');
const test = read('supabase/tests/045_phase17_4_supabase_free_capacity.test.sql');
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

ok(dashboard.includes('Organization-level quotas'), 'dashboard must explain omitted organization quotas');
ok(dashboard.includes('Supabase Usage'), 'dashboard must point admins to authoritative organization usage');
ok(!service.includes('client.functions.invoke'), 'Capacity page must not invoke provider Edge Functions');
ok(!service.includes('VITE_NETLIFY_CAPACITY_ENABLED'), 'Capacity page must not initialize unused Netlify telemetry');
ok(/select\s+plan\s*\(\s*6\s*\)/i.test(test), 'pgTAP suite must retain 6 assertions');
ok(test.trimEnd().endsWith('rollback;'), 'pgTAP suite must remain rollback safe');

console.log('Phase 17.4 measurable-capacity validation passed: 3 live signals, no fake provider telemetry or provider network calls.');
