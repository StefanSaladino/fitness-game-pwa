const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
let assertions = 0;
function ok(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(`Validation failed: ${message}`);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const required = [
  'README.md','CHANGELOG.md','docs/ROADMAP.md','docs/DOMAIN-RULES.md','docs/TESTING.md','docs/ARCHITECTURE.md','docs/DATABASE.md','docs/SUPABASE-SETUP.md','docs/ENVIRONMENT.md','docs/VALIDATION.md','docs/REFERENCES.md','docs/UI-DEVELOPMENT-GATE.md','docs/UI-ARCHITECTURE.md','docs/PHASE5-ONBOARDING-FOUNDATION.md','.gitignore','.env.example',
  'supabase/migrations/20260818000100_initial_data_foundation.sql','supabase/migrations/20260818000200_phase5_onboarding_foundation.sql','supabase/seed.sql',
  'supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql',
  'src/features/auth/authService.ts','src/features/auth/AuthProvider.tsx','src/features/auth/AuthScreen.tsx','src/features/auth/ResetPasswordScreen.tsx',
  'src/features/onboarding/model.ts','src/features/onboarding/validation.ts','src/features/onboarding/state.ts','src/features/onboarding/onboardingService.ts',
  'src/components/ui/Button.tsx','src/components/ui/Card.tsx','src/components/ui/Icon.tsx','src/components/ui/ProgressBar.tsx','src/components/ui/TextField.tsx','src/components/ui/SelectField.tsx',
  'src/components/layout/AppShell.tsx','src/components/layout/DesktopSidebar.tsx','src/components/layout/MobileNav.tsx','src/components/layout/PageHeader.tsx','src/components/layout/navigation.ts'
];
for (const rel of required) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);

JSON.parse(read('package.json'));
JSON.parse(read('public/manifest.webmanifest'));
ok(true, 'JSON files parse');

const migration = read('supabase/migrations/20260818000100_initial_data_foundation.sql');
const phase5Migration = read('supabase/migrations/20260818000200_phase5_onboarding_foundation.sql');
ok((phase5Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 5 migration dollar-quote delimiters are balanced');
ok(phase5Migration.includes('p_username text'), 'Phase 5 onboarding RPC accepts username');
ok(phase5Migration.includes("v_username !~ '^[a-z0-9_]{3,32}$'"), 'Phase 5 onboarding validates canonical username');
ok(phase5Migration.includes('Username already taken'), 'Phase 5 onboarding handles username uniqueness explicitly');
ok((migration.match(/\$\$/g) || []).length % 2 === 0, 'migration dollar-quote delimiters are balanced');
for (const table of ['profiles','groups','group_members','group_invites','exercise_catalog','workout_sessions','workout_exercises','workout_sets','xp_events','performance_observations','performance_benchmarks','weekly_goals']) {
  ok(migration.includes(`create table public.${table}`), `migration creates ${table}`);
  ok(migration.includes(`alter table public.${table} enable row level security`), `${table} has RLS enabled`);
}
for (const fn of ['complete_onboarding','schedule_weekly_target','join_group_by_invite','remove_group_member','set_group_member_role','transfer_group_ownership','leave_group','prepare_workout_session']) {
  ok(migration.includes(`function public.${fn}`), `migration includes ${fn}`);
}
ok(!/member_count\s*[<=>]/i.test(migration), 'no hard-coded group member-count limit');
ok(!/grant\s+insert[^;]*public\.xp_events\s+to\s+authenticated/i.test(migration), 'authenticated cannot insert XP ledger');
ok(!/grant\s+(insert|update|delete)[^;]*public\.performance_benchmarks\s+to\s+authenticated/i.test(migration), 'authenticated cannot mutate benchmark state');
ok(migration.includes('group_members_one_active_owner'), 'single-active-owner uniqueness exists');
ok(migration.includes("new.active_duration_seconds > 21600"), 'six-hour review rule is represented');

for (const rel of ['supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql']) {
  const sql = read(rel);
  const plan = Number((sql.match(/select\s+plan\((\d+)\)/i) || [])[1]);
  const count = (sql.match(/select\s+(?:has_table|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
  ok(Number.isInteger(plan), `${rel} has a pgTAP plan`);
  ok(plan === count, `${rel} plan ${plan} matches ${count} assertions`);
}

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(entry.name)) sourceFiles.push(p);
  }
}
walk(path.join(root, 'src'));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: file });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  ok(errors.length === 0, `TypeScript syntax parses: ${path.relative(root,file)}`);
}


const componentFiles = sourceFiles.filter(file => file.includes(`${path.sep}components${path.sep}`));
for (const file of componentFiles) {
  const source = fs.readFileSync(file, 'utf8');
  ok(!/from ['"][^'"]*supabase/i.test(source), `${path.relative(root,file)} does not import Supabase`);
  ok(!/BASE_WORKOUT_XP|MAX_DAILY_PERFORMANCE_XP|calculateDaily|performanceBonus/i.test(source), `${path.relative(root,file)} does not own domain scoring`);
}
const navigation = read('src/components/layout/navigation.ts');
ok(!/nutrition/i.test(navigation), 'primary navigation excludes Nutrition');
ok(!/calories?/i.test(navigation), 'primary navigation excludes calorie tracking');
const uiArchitecture = read('docs/UI-ARCHITECTURE.md');
ok(/future native companion/i.test(uiArchitecture), 'watch UI is documented as a separate future native companion');
const globalCss = read('src/styles/global.css');
ok(globalCss.includes('@media (min-width: 1024px)'), 'desktop responsive breakpoint exists');
ok(globalCss.includes('.mobile-nav'), 'mobile bottom navigation styling exists');
ok(globalCss.includes('.desktop-sidebar'), 'desktop sidebar styling exists');

const env = read('.env.example');
const envAssignments = env.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).join('\n');
ok(!/service[_-]?role|secret[_-]?key|database_url|postgres_password/i.test(envAssignments), '.env.example contains no privileged secret assignments');
ok(!/sb_secret_/i.test(envAssignments), '.env.example contains no Supabase secret key value');
ok(env.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'browser-safe Supabase key variable documented');
const gitignore = read('.gitignore');
for (const pattern of ['.env', '.env.*', '!.env.example', '*.pem', '*.key', 'supabase/.env']) {
  ok(gitignore.includes(pattern), `.gitignore protects ${pattern}`);
}

console.log(`Project structural validation passed: ${assertions} assertions.`);
