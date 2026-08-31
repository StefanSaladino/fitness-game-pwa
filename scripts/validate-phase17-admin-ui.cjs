const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17 admin UI validation failed: ${message}`);
};

const shell = read('src/features/admin/components/PlatformAdminShell.module.css');
const users = read('src/features/admin/accounts/components/UserAdministration.module.css');
const capacityCss = read('src/features/admin/capacity/components/CapacityDashboard.module.css');
const capacity = read('src/features/admin/capacity/components/CapacityDashboard.tsx');

ok(shell.includes('container-type: inline-size'), 'admin content must establish an inline-size container');
ok(shell.includes('overflow-x: auto'), 'mobile admin destinations must scroll instead of compressing text');

ok(users.includes('@container (min-width: 1040px)'), 'users split view must key off content-container width');
ok(!users.includes('@media (min-width: 1220px)'), 'users split view must not key off raw viewport width');
ok(users.includes('overflow-wrap: anywhere'), 'long account identity/detail values must wrap');
ok(users.includes('.signInCell') && !/\.signInCell\s*\{\s*display:\s*none/i.test(users), 'last sign-in must remain visible in the directory');

ok(capacity.includes('Measured capacity'), 'capacity page must expose the corrected measurable-capacity surface');
ok(capacity.includes('Netlify account telemetry'), 'capacity page must expose the secured Netlify provider boundary');
ok(capacity.includes('Provider quota boundaries'), 'capacity page must explain provider metrics that remain intentionally unavailable');
ok(!capacity.includes('Provider status'), 'capacity page must not return to provider-status pseudo-telemetry');
ok(capacity.includes('data-capacity-metric'), 'database-local capacity cards require stable visual-test hooks');
ok(capacity.includes('data-netlify-metric'), 'Netlify unavailable metrics require stable visual-test hooks');
ok(capacityCss.includes('.metricGrid'), 'capacity metrics must use the responsive card grid');
ok(capacityCss.includes('repeat(auto-fit'), 'capacity metric grid must adapt to available width');
ok(!capacityCss.includes('grid-template-columns: minmax(0, 1fr) auto;\n  gap: 5px'), 'legacy compressed metric row layout must be removed');

console.log('Phase 17 admin UI validation passed: production CSS/TSX structure is container-driven, database telemetry remains measurable, and the secured Netlify provider fails closed.');
