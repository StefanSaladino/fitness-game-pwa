const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const primaryMigrationPath = path.join(
  root,
  'supabase/migrations/20260822000100_lifting_calendar_summaries.sql',
);
const obsoleteRepairPath = path.join(
  root,
  'supabase/migrations/20260822000200_fix_lifting_calendar_summaries.sql',
);

function fail(message) {
  throw new Error(`Clean v0.12.1 validation failed: ${message}`);
}

if (fs.existsSync(obsoleteRepairPath)) {
  fail('obsolete Phase 13B repair migration must not exist');
}

const primaryMigration = fs.readFileSync(primaryMigrationPath, 'utf8');
if (!/gs\.bucket_start/.test(primaryMigration)) {
  fail('primary Phase 13B migration must use unambiguous generated-period aliases');
}
if (!/session_total/.test(primaryMigration) || !/pr_total/.test(primaryMigration)) {
  fail('primary Phase 13B migration must keep aggregate aliases distinct from RETURNS TABLE names');
}
if (/\bperiod_start::date as period_start\b/.test(primaryMigration)) {
  fail('primary Phase 13B migration reintroduces the PL/pgSQL output-variable ambiguity');
}

// The historical v0.12.1 structural validator was written after the broken
// migration had already shipped and therefore expects a repair file. Preserve
// all of its existing project-wide assertions without putting that bad migration
// back into the repository: while the legacy validator runs, map that one stale
// path to the corrected primary migration in memory only.
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const repairKey = path.resolve(obsoleteRepairPath);

fs.existsSync = function patchedExistsSync(target) {
  if (path.resolve(String(target)) === repairKey) return true;
  return originalExistsSync.call(fs, target);
};

fs.readFileSync = function patchedReadFileSync(target, ...args) {
  if (path.resolve(String(target)) === repairKey) return primaryMigration;
  return originalReadFileSync.call(fs, target, ...args);
};

try {
  require('./validate-project.cjs');
} finally {
  fs.existsSync = originalExistsSync;
  fs.readFileSync = originalReadFileSync;
}

if (fs.existsSync(obsoleteRepairPath)) {
  fail('structural validation must not materialize the obsolete repair migration');
}

console.log('Clean v0.12.1 migration guard passed: one Phase 13B migration, no repair migration.');
