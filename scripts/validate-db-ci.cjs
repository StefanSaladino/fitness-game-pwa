const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const testsDir = path.join(root, 'supabase', 'tests');

function fail(message) {
  throw new Error(`Database contract gate failed: ${message}`);
}

function listSql(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
}

function assertNoConflictMarkers(source, label) {
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(source)) {
    fail(`unresolved merge conflict markers found in ${label}`);
  }
}

const migrations = listSql(migrationsDir);
const tests = listSql(testsDir).filter((name) => name.endsWith('.test.sql'));

if (migrations.length === 0) fail('no SQL migrations found');
if (tests.length === 0) fail('no *.test.sql pgTAP suites found');

const migrationPattern = /^(\d{14})_[a-z0-9_]+\.sql$/;
const migrationTimestamps = new Set();

for (const name of migrations) {
  const match = name.match(migrationPattern);
  if (!match) fail(`migration filename is not canonical: ${name}`);
  if (migrationTimestamps.has(match[1])) fail(`duplicate migration timestamp: ${match[1]}`);
  migrationTimestamps.add(match[1]);

  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
  if (!sql.trim()) fail(`migration is empty: ${name}`);
  assertNoConflictMarkers(sql, name);
}

for (const name of tests) {
  const sql = fs.readFileSync(path.join(testsDir, name), 'utf8');

  if (!sql.trim()) fail(`pgTAP suite is empty: ${name}`);
  assertNoConflictMarkers(sql, name);

  if (!/^\s*begin\s*;/im.test(sql)) {
    fail(`${name} must open a rollback-safe transaction`);
  }

  if (!/\bselect\s+plan\s*\(\s*\d+\s*\)\s*;/i.test(sql)) {
    fail(`${name} must declare a pgTAP plan`);
  }

  if (!/\brollback\s*;\s*$/i.test(sql.trim())) {
    fail(`${name} must finish with ROLLBACK`);
  }
}

console.log(
  `Database contract gate passed: ${migrations.length} migrations and ${tests.length} pgTAP suites satisfy generic SQL hygiene.`,
);
