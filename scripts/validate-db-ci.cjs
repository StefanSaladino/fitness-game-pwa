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
for (const relativePath of [phase153aMigration, phase153aTest]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15.3A database artifact missing: ${relativePath}`);
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
