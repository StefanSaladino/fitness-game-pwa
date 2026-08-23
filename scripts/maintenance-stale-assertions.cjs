const fs = require('node:fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function write(file, content) {
  fs.writeFileSync(file, content);
}
function replaceExactly(file, regex, replacement, label) {
  const source = read(file);
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) {
    throw new Error(`${file}: expected one ${label} match, found ${matches.length}`);
  }
  write(file, source.replace(regex, replacement));
}

const project = 'scripts/validate-project.cjs';
replaceExactly(
  project,
  /^\s*'supabase\/migrations\/20260822000200_fix_lifting_calendar_summaries\.sql',\r?\n/m,
  '',
  'obsolete Phase 13B repair required-file',
);
replaceExactly(
  project,
  /^const phase13bRepairMigration = read\('supabase\/migrations\/20260822000200_fix_lifting_calendar_summaries\.sql'\);\r?\n/m,
  '',
  'obsolete Phase 13B repair read',
);
replaceExactly(
  project,
  /ok\(\/create or replace function public\\\.get_my_lifting_calendar_summaries\/\.test\(phase13bRepairMigration\)[\s\S]*?ok\(\/bucket_start\/\.test\(phase13bRepairMigration\)[\s\S]*?'Phase 13B repair keeps internal aggregate names distinct from RETURNS TABLE output variables'\);/,
  "ok(/gs\\.bucket_start/.test(phase13bMigration) && !/\\bperiod_start::date as period_start\\b/.test(phase13bMigration), 'Phase 13B primary migration keeps generated calendar buckets unambiguous');\nok(/bucket_start/.test(phase13bMigration) && /bucket_end/.test(phase13bMigration) && /session_total/.test(phase13bMigration) && /pr_total/.test(phase13bMigration), 'Phase 13B primary migration keeps internal aggregate names distinct from RETURNS TABLE output variables');",
  'Phase 13B repair assertions',
);
replaceExactly(
  project,
  /ok\(packageJson\.version === '0\.12\.1' && packageLockJson\.version === '0\.12\.1', 'project metadata records v0\.12\.1'\);/,
  "ok(versionAtLeast(packageJson.version, '0.13.0') && versionAtLeast(packageLockJson.version, '0.13.0'), 'project metadata is at or beyond v0.13.0');",
  'frozen v0.12.1 metadata assertion',
);
replaceExactly(
  project,
  /ok\(\/CACHE_PREFIX = 'workout-game-shell-'\/\.test\(phase12bSw\) && \/v12b-2\/\.test\(phase12bSw\), 'Phase 12B service worker uses an explicit versioned shell cache'\);/,
  "ok(/CACHE_PREFIX = 'workout-game-shell-'/.test(phase12bSw) && /const CACHE_VERSION = 'v13-2'/.test(phase12bSw), 'current service worker retains an explicit versioned shell cache');",
  'historical v12b-2 cache assertion',
);

const clean = 'scripts/validate-project-clean.cjs';
replaceExactly(
  clean,
  /if \(!\/const\\s\+CACHE_VERSION\\s\*=\\s\*\['"\]v13-1\['"\]\/\.test\(serviceWorker\)\) \{\r?\n\s*fail\('Phase 15\.1 must declare service-worker cache version v13-1'\);\r?\n\}/,
  "if (!/const\\s+CACHE_VERSION\\s*=\\s*['\"]v13-2['\"]/.test(serviceWorker)) {\n  fail('current service worker must declare cache version v13-2');\n}",
  'historical v13-1 cache assertion',
);
replaceExactly(
  clean,
  /if \(!\/15\\\.6 Profile\\\/Settings \\\\+ notification preferences \.*IN PROGRESS\/\.test\(roadmap\)\) \{[\s\S]*?if \(!roadmap\.includes\(heading\)\) fail\(`roadmap missing settings\/notification slice: \$\{heading\}`\);\r?\n\}/,
  "if (!/15\\.6 Profile\\/Settings \\+ notification preferences .*DONE/.test(roadmap)) {\n  fail('roadmap must mark the Profile/Settings + notification preferences phase done');\n}\nfor (const heading of [\n  '15.6A Profile/Settings foundation — DONE',\n  '15.6B Notification preference persistence — DONE',\n  '15.6C PWA notification permission + delivery integration — DONE',\n  '15.6D Settings integration gate — DONE',\n]) {\n  if (!roadmap.includes(heading)) fail(`roadmap missing settings/notification slice: ${heading}`);\n}",
  'Phase 15.6 stale roadmap block',
);
replaceExactly(
  clean,
  /const phase156aScreen = read\('src\/features\/settings\/SettingsScreen\.tsx'\);\r?\n/,
  "const phase156aScreen = read('src/features/settings/SettingsScreen.tsx');\nconst phase156NotificationSection = read('src/features/settings/NotificationSettingsSection.tsx');\n",
  'SettingsScreen declaration',
);
replaceExactly(
  clean,
  /for \(const heading of \['Profile picture', 'Notifications', 'Security', 'Groups', 'Privacy & data'\]\) \{[\s\S]*?fail\('Phase 15\.6A must not expose notification toggles before persistence and delivery exist'\);\r?\n\}/,
  "for (const heading of ['Profile picture', 'Security', 'Groups', 'Privacy & data']) {\n  if (!phase156aScreen.includes(heading)) fail('Settings surface missing section: ' + heading);\n}\nif (!phase156aScreen.includes('NotificationSettingsSection') || !phase156NotificationSection.includes('Notifications')) {\n  fail('Settings must compose the extracted Notifications section');\n}\nfor (const control of ['Badges & achievements', 'Personal records', 'Group invitations']) {\n  if (!phase156NotificationSection.includes(control)) fail('Notifications surface missing supported control: ' + control);\n}\nif (!/role=[\"']switch[\"']/.test(phase156NotificationSection)) {\n  fail('supported notification categories must expose real switches');\n}\nif (/type=[\"']checkbox[\"']|role=[\"']switch[\"']/.test(phase156aProfileForm)) {\n  fail('profile form must not absorb notification controls');\n}",
  'Phase 15.6A pre-delivery notification assertion block',
);
replaceExactly(
  clean,
  /phase156aScreen \+ phase156aProfileForm \+ phase156aDeletion/,
  'phase156aScreen + phase156NotificationSection + phase156aProfileForm + phase156aDeletion',
  'Settings presentation boundary source list',
);
replaceExactly(
  clean,
  /const ciWorkflow = read\('\.github\/workflows\/ci\.yml'\);[\s\S]*?if \(!\/Phase 16 \.*Mobile-first visual overhaul \.*LATER\/\.test\(roadmap\)\) fail\('roadmap must include the mobile-first visual overhaul'\);/,
  `const ciWorkflow = read('.github/workflows/ci.yml');
const supabaseConfig = read('supabase/config.toml');
const hostedAggregateSentinel = read('supabase/tests/_all-hosted-tests.sql');
const ciDoc = read('docs/CI-VALIDATION.md');
const currentPackageJson = JSON.parse(read('package.json'));
if (currentPackageJson.scripts?.['db:test']) {
  fail('ambiguous db:test script must stay removed; the supported repository gate is db:test:ci');
}
if (!String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-db-ci.cjs')
    || !String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-phase15-6b.cjs')
    || !String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-phase15-6c.cjs')) {
  fail('db:test:ci must retain the current static database contract validators');
}
for (const command of [
  'npm ci',
  'npm run typecheck',
  'npm test',
  'npm run test:integration',
  'npm run build',
  'npm run test:structure',
  'npm run test:internal',
  'npx playwright install --with-deps chromium webkit',
  'npm run test:e2e',
  'npm run db:test:ci',
]) {
  if (!ciWorkflow.includes(command)) fail(\`GitHub CI missing required gate command: \${command}\`);
}
for (const staleCommand of [
  'npx supabase start',
  'npx supabase db reset',
  'npm run db:test:local',
  'npx supabase db lint --level warning',
]) {
  if (ciWorkflow.includes(staleCommand)) fail(\`GitHub CI must not retain stale local-Supabase command text: \${staleCommand}\`);
}
if (!/node-version:\\s*24/.test(ciWorkflow)) fail('GitHub CI must match the Node 24 release environment');
if (!/project_id\\s*=\\s*"fitness-game-pwa"/.test(supabaseConfig)
    || !/major_version\\s*=\\s*17/.test(supabaseConfig)
    || !/site_url\\s*=\\s*"http:\\/\\/localhost:5173"/.test(supabaseConfig)) {
  fail('committed Supabase CLI config must remain non-secret, Postgres-17 aligned, and Vite-auth compatible');
}
const sentinelPlans = (hostedAggregateSentinel.match(/select\\s+plan\\(/gi) || []).length;
if (sentinelPlans !== 1 || /-- ={10,}\\s*\\n-- 00\\d_/m.test(hostedAggregateSentinel)) {
  fail('_all-hosted-tests.sql must remain a one-plan compatibility sentinel, never a concatenated pgTAP bundle');
}
if (!/Only files matching this convention are canonical database suites/.test(ciDoc)
    || !/does not require Docker|Docker.*not part/i.test(ciDoc)
    || !/supabase\\/tests\\/\\*\\.test\\.sql/.test(ciDoc)) {
  fail('CI documentation must preserve canonical test discovery and the hosted-Supabase/no-Docker workflow');
}

if (!/Phase 16 .*Mobile-first visual overhaul .*NEXT/.test(roadmap)) fail('roadmap must mark the mobile-first visual overhaul next');`,
  'stale CI and Phase 16 assertion block',
);
replaceExactly(
  clean,
  /\/\/ The historical v0\.12\.1 structural validator was written after the broken[\s\S]*?console\.log\('Release validation passed:[\s\S]*?\);\s*$/,
  `// Baseline structural validation is current and runs directly without synthetic files or metadata.
require('./validate-project.cjs');

console.log('Release validation passed: clean migration history, current PWA/cache state, Phase 15 admin/capacity/account/messaging/security invariants, completed Phase 15.6 Settings/notification contracts, Docker-free GitHub CI/database discovery, the Phase 16 handoff, and production chunk-budget guards are present.');
`,
  'legacy filesystem/version monkeypatch tail',
);

const wrapper = 'scripts/run-structural-validation.cjs';
const wrapperSource = read(wrapper);
const compatibilityMarker = '// validate-project-clean.cjs is an older Phase 15.6A checkpoint validator with';
const markerIndex = wrapperSource.indexOf(compatibilityMarker);
if (markerIndex === -1) throw new Error('run-structural-validation.cjs: compatibility marker not found');
const wrapperPrefix = wrapperSource.slice(0, markerIndex).trimEnd();
write(
  wrapper,
  `${wrapperPrefix}\n\nfor (const [file, fragments] of [\n  ['scripts/validate-project-clean.cjs', ['v13-1', '15.6B Notification preference persistence — LATER', '15.6C PWA notification permission + delivery integration — LATER', '15.6D Settings integration gate — LATER']],\n  ['scripts/validate-project.cjs', ['0.12.1', '20260822000200_fix_lifting_calendar_summaries.sql', 'v12b-2']],\n  ['public/sw.js', ['v12b-2']],\n  ['.github/workflows/ci.yml', ['npx supabase start', 'npx supabase db reset', 'npm run db:test:local', 'npx supabase db lint --level warning']],\n]) {\n  const text = fs.readFileSync(path.join(root, file), 'utf8');\n  for (const fragment of fragments) {\n    if (text.includes(fragment)) throw new Error(\`Stale assertion cleanup failed: \${file} still contains \${fragment}\`);\n  }\n}\n\nrequire('./validate-project-clean.cjs');\n\nconsole.log('Current Phase 15.6/16 structural gate passed with no legacy assertion shims.');\n`,
);

write(
  'public/sw.js',
  read('public/sw.js').replace('// Historical Phase 12B shell checkpoint: v12b-2. Current releases advance CACHE_VERSION below.\n', ''),
);

const canonicalCi = `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  application:
    name: Application gate
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:integration
      - run: npm run build
      - run: npm run test:structure
      - run: npm run test:internal

  browser:
    name: Browser gate
    runs-on: ubuntu-latest
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e

  database:
    name: Database gate
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Validate database migration and pgTAP contracts
        run: npm run db:test:ci
`;
write('.github/workflows/ci.yml', canonicalCi);

fs.rmSync('.github/workflows/maintenance-stale-assertions.yml', { force: true });
fs.rmSync('scripts/maintenance-stale-assertions.cjs', { force: true });
