const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const testsDirectory = path.join(root, 'supabase', 'tests');

const canonicalTests = fs
  .readdirSync(testsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.test.sql'))
  .map((entry) => `supabase/tests/${entry.name}`)
  .sort((left, right) => left.localeCompare(right, 'en'));

if (canonicalTests.length === 0) {
  console.error('Database test gate failed: no canonical *.test.sql pgTAP suites were found.');
  process.exit(1);
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
console.log(`Running ${canonicalTests.length} canonical pgTAP suites.`);

const result = spawnSync(
  npxCommand,
  ['supabase', 'test', 'db', ...canonicalTests],
  { cwd: root, stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
