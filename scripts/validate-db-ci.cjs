const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const testsDir = path.join(root, 'supabase', 'tests');
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');

function fail(message) {
  throw new Error(`Database contract gate failed: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function listSql(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
}

const migrations = listSql(migrationsDir);
const tests = listSql(testsDir).filter((name) => name.endsWith('.test.sql'));

if (migrations.length === 0) fail('no SQL migrations found');
if (tests.length === 0) fail('no canonical *.test.sql pgTAP suites found');

const migrationPattern = /^(\d{14})_[a-z0-9_]+\.sql$/;
const migrationTimestamps = new Set();
for (const name of migrations) {
  const match = name.match(migrationPattern);
  if (!match) fail(`migration filename is not canonical: ${name}`);
  if (migrationTimestamps.has(match[1])) fail(`duplicate migration timestamp: ${match[1]}`);
  migrationTimestamps.add(match[1]);
  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
  if (!sql.trim()) fail(`migration is empty: ${name}`);
}

const testNumberPattern = /^(\d{3})_[a-z0-9_]+\.test\.sql$/;
const testNumbers = new Set();
for (const name of tests) {
  const match = name.match(testNumberPattern);
  if (!match) fail(`canonical pgTAP filename is invalid: ${name}`);
  if (testNumbers.has(match[1])) fail(`duplicate canonical pgTAP number: ${match[1]}`);
  testNumbers.add(match[1]);

  const sql = fs.readFileSync(path.join(testsDir, name), 'utf8');
  if (!/^\s*begin\s*;/im.test(sql)) fail(`${name} must open a rollback-safe transaction`);
  if (!/\bselect\s+plan\s*\(\s*\d+\s*\)\s*;/i.test(sql)) fail(`${name} must declare an explicit pgTAP plan`);
  if (!/\brollback\s*;\s*$/i.test(sql.trim())) fail(`${name} must finish with ROLLBACK`);
}

const phase153aMigration = 'supabase/migrations/20260822120300_platform_account_administration_foundation.sql';
const phase153aTest = 'supabase/tests/030_platform_account_administration_foundation.test.sql';
const phase153bMigration = 'supabase/migrations/20260822161454_platform_account_suspension_enforcement.sql';
const phase153bHardeningMigration = 'supabase/migrations/20260822161801_harden_active_account_pre_request.sql';
const phase153bHookSchemaMigration = 'supabase/migrations/20260822162155_move_account_hooks_out_of_data_api.sql';
const phase153bTest = 'supabase/tests/031_platform_account_suspension_enforcement.test.sql';
const phase153cMigration = 'supabase/migrations/20260822172823_platform_account_irreversible_deletion.sql';
const phase153cTest = 'supabase/tests/032_platform_account_irreversible_deletion.test.sql';
for (const relativePath of [
  phase153aMigration,
  phase153aTest,
  phase153bMigration,
  phase153bHardeningMigration,
  phase153bHookSchemaMigration,
  phase153bTest,
  phase153cMigration,
  phase153cTest,
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15.3 database artifact missing: ${relativePath}`);
}

const migration153a = read(phase153aMigration);
for (const invariant of [
  'private.require_active_account()',
  'public.list_platform_accounts',
  'public.get_platform_account_detail',
  'public.suspend_platform_account',
  'public.restore_platform_account',
  'public.request_platform_account_deletion',
  'public.cancel_platform_account_deletion',
]) {
  if (!migration153a.includes(invariant)) fail(`Phase 15.3A migration missing invariant: ${invariant}`);
}

const test153a = read(phase153aTest);
if (!/select\s+plan\s*\(\s*68\s*\)\s*;/i.test(test153a)) {
  fail('Phase 15.3A pgTAP suite must retain its 68-assertion plan');
}

const migration153b = read(phase153bMigration);
for (const invariant of [
  'private.platform_auth_coordination',
  'public.is_current_account_session_active',
  'public.enforce_active_account_request',
  'public.prepare_platform_account_auth_transition',
  'public.complete_platform_account_auth_transition',
  'pgrst.db_pre_request',
  'join auth.sessions',
  'profile_pictures_insert_own',
]) {
  if (!migration153b.includes(invariant)) fail(`Phase 15.3B migration missing invariant: ${invariant}`);
}

const test153b = read(phase153bTest);
if (!/select\s+plan\s*\(\s*52\s*\)\s*;/i.test(test153b)) {
  fail('Phase 15.3B pgTAP suite must retain its 52-assertion plan');
}

const hardening153b = read(phase153bHardeningMigration);
for (const invariant of [
  'security invoker',
  'public.is_current_account_session_active()',
  'Account or session is not active',
  'to authenticator',
]) {
  if (!hardening153b.toLowerCase().includes(invariant.toLowerCase())) {
    fail(`Phase 15.3B pre-request hardening missing invariant: ${invariant}`);
  }
}

const hookSchema153b = read(phase153bHookSchemaMigration);
for (const invariant of [
  'create schema if not exists api_hooks',
  'set schema api_hooks',
  "pgrst.db_pre_request = 'api_hooks.enforce_active_account_request'",
  'grant usage on schema api_hooks',
]) {
  if (!hookSchema153b.includes(invariant)) {
    fail(`Phase 15.3B non-exposed hook schema missing invariant: ${invariant}`);
  }
}

const migration153c = read(phase153cMigration);
for (const invariant of [
  'private.platform_account_deletion_jobs',
  'public.request_own_platform_account_deletion',
  'public.cancel_own_platform_account_deletion',
  'public.prepare_platform_account_deletion',
  'public.mark_platform_account_deletion_storage_cleared',
  'public.record_platform_account_deletion_failure',
  'auth_users_begin_platform_account_delete',
  'profiles_finalize_platform_account_delete',
  'Group ownership must be transferred before account deletion',
  'Profile deletion must be coordinated through Auth',
]) {
  if (!migration153c.includes(invariant)) fail(`Phase 15.3C migration missing invariant: ${invariant}`);
}
if (/\b(?:delete\s+from|insert\s+into|update)\s+storage\.(?:objects|buckets)\b/i.test(migration153c)) {
  fail('Phase 15.3C migration must never mutate Supabase Storage metadata with SQL');
}

const test153c = read(phase153cTest);
if (!/select\s+plan\s*\(\s*68\s*\)\s*;/i.test(test153c)) {
  fail('Phase 15.3C pgTAP suite must retain its 68-assertion plan');
}
for (const coverage of [
  'hard Auth deletion is blocked before Storage cleanup completes',
  'authoritative scoring history follows the documented profile cascade',
  'self-service exact confirmation prepares the same deletion engine',
  'direct hard Auth deletion cannot bypass pending-state and preparation checks',
]) {
  if (!test153c.includes(coverage)) fail(`Phase 15.3C pgTAP missing coverage: ${coverage}`);
}

const ci = fs.readFileSync(ciPath, 'utf8');
const executableCi = ci
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');
const forbiddenCiPatterns = [
  [/\bsupabase\s+start\b/i, 'supabase start'],
  [/\bsupabase\s+stop\b/i, 'supabase stop'],
  [/\bsupabase\s+db\s+reset\b/i, 'supabase db reset'],
  [/\bsupabase\s+test\s+db\b/i, 'supabase test db'],
  [/\bdocker\b/i, 'Docker'],
];
for (const [pattern, label] of forbiddenCiPatterns) {
  if (pattern.test(executableCi)) fail(`CI must not execute or depend on ${label}`);
}
if (!executableCi.includes('npm run db:test:ci')) {
  fail('CI Database gate must run npm run db:test:ci');
}

console.log(`Database contract gate passed: ${migrations.length} migrations, ${tests.length} canonical pgTAP suites.`);
console.log('Runtime SQL execution remains hosted-Supabase authoritative; CI does not start Docker or a local Supabase stack.');
