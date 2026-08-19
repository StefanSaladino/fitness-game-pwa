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
  'README.md','CHANGELOG.md','docs/ROADMAP.md','docs/DOMAIN-RULES.md','docs/TESTING.md','docs/ARCHITECTURE.md','docs/DATABASE.md','docs/SUPABASE-SETUP.md','docs/ENVIRONMENT.md','docs/VALIDATION.md','docs/REFERENCES.md','docs/UI-DEVELOPMENT-GATE.md','docs/UI-ARCHITECTURE.md','docs/CSS-ARCHITECTURE.md','docs/PHASE5-ONBOARDING-FOUNDATION.md','docs/PHASE5.3A-AUTH-ONBOARDING-UI.md','docs/PHASE5.5A-GROUP-FOUNDATION.md','.gitignore','.env.example',
  'supabase/migrations/20260818000100_initial_data_foundation.sql','supabase/migrations/20260818000200_phase5_onboarding_foundation.sql','supabase/migrations/20260819000100_lifting_first_scoring_foundation.sql','supabase/seed.sql',
  'supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql',
  'src/domain/scoring/exerciseXp.ts','src/domain/scoring/cardioBonus.ts','src/domain/scoring/dailyXp.ts','src/styles/tokens.css','src/styles/reset.css','src/styles/base.css',
  'src/features/auth/authService.ts','src/features/auth/AuthProvider.tsx','src/features/auth/AuthScreen.tsx','src/features/auth/ResetPasswordScreen.tsx','src/features/auth/authValidation.ts','src/features/auth/authMessages.ts','src/features/auth/hooks/useAuthActions.ts','src/features/auth/components/AuthLayout.tsx','src/features/auth/components/SignInForm.tsx','src/features/auth/components/SignUpForm.tsx','src/features/auth/components/ForgotPasswordForm.tsx','src/features/auth/components/VerifyEmailPanel.tsx',
  'src/features/onboarding/model.ts','src/features/onboarding/validation.ts','src/features/onboarding/state.ts','src/features/onboarding/onboardingService.ts','src/features/onboarding/timezones.ts','src/features/onboarding/onboardingMessages.ts','src/features/onboarding/hooks/useOnboarding.ts','src/features/onboarding/components/OnboardingForm.tsx','src/features/onboarding/components/OnboardingScreen.tsx','src/features/onboarding/components/WeeklyTargetPicker.tsx',
  'src/features/groups/model.ts','src/features/groups/validation.ts','src/features/groups/groupMessages.ts','src/features/groups/groupService.ts','src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts',
  'src/components/ui/Button.tsx','src/components/ui/Card.tsx','src/components/ui/Icon.tsx','src/components/ui/ProgressBar.tsx','src/components/ui/TextField.tsx','src/components/ui/SelectField.tsx',
  'src/components/layout/AppShell.tsx','src/components/layout/DesktopSidebar.tsx','src/components/layout/MobileNav.tsx','src/components/layout/PageHeader.tsx','src/components/layout/navigation.ts'
];
for (const rel of required) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);

const packageJson = JSON.parse(read('package.json'));
JSON.parse(read('public/manifest.webmanifest'));
ok(true, 'JSON files parse');
ok(packageJson.scripts?.['test:internal'] === 'node scripts/internal-test.cjs', 'internal verifier is cross-platform Node');
ok(!/\bbash\b/i.test(packageJson.scripts?.['test:internal'] || ''), 'internal verifier does not require Bash');

const migration = read('supabase/migrations/20260818000100_initial_data_foundation.sql');
const phase5Migration = read('supabase/migrations/20260818000200_phase5_onboarding_foundation.sql');
ok((phase5Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 5 migration dollar-quote delimiters are balanced');
ok(phase5Migration.includes('p_username text'), 'Phase 5 onboarding RPC accepts username');
ok(phase5Migration.includes("v_username !~ '^[a-z0-9_]{3,32}$'"), 'Phase 5 onboarding validates canonical username');
ok(phase5Migration.includes('Username already taken'), 'Phase 5 onboarding handles username uniqueness explicitly');
const liftingMigration = read('supabase/migrations/20260819000100_lifting_first_scoring_foundation.sql');
ok((liftingMigration.match(/\$\$/g) || []).length % 2 === 0, 'lifting-v1 migration dollar-quote delimiters are balanced');
for (const table of ['scoring_events','exercise_progress_observations','exercise_progress']) {
  ok(liftingMigration.includes(`create table public.${table}`), `lifting-v1 migration creates ${table}`);
  ok(liftingMigration.includes(`alter table public.${table} enable row level security`), `${table} has RLS enabled`);
}
ok(liftingMigration.includes('qualifies_lifting'), 'lifting-v1 migration adds explicit lifting qualification');
ok(liftingMigration.includes('qualifies_cardio_bonus'), 'lifting-v1 migration adds explicit cardio bonus qualification');
ok(liftingMigration.includes("'LIFTING_WORKOUT'"), 'lifting-v1 scoring event type includes lifting workout');
ok(liftingMigration.includes("'EXERCISE_COMPLETE'"), 'lifting-v1 scoring event type includes exercise completion');
ok(liftingMigration.includes("'EXERCISE_PROGRESS'"), 'lifting-v1 scoring event type includes exercise progression');
ok(liftingMigration.includes("'CARDIO_BONUS'"), 'lifting-v1 scoring event type includes cardio bonus');
ok(!/grant\s+(insert|update|delete)[^;]*public\.scoring_events\s+to\s+authenticated/i.test(liftingMigration), 'authenticated cannot mutate lifting-v1 scoring ledger');
ok(!/grant\s+(insert|update|delete)[^;]*public\.exercise_progress\s+to\s+authenticated/i.test(liftingMigration), 'authenticated cannot mutate exercise progress');

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

for (const rel of ['supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql']) {
  const sql = read(rel);
  const plan = Number((sql.match(/select\s+plan\((\d+)\)/i) || [])[1]);
  const count = (sql.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
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
const authScreen = read('src/features/auth/AuthScreen.tsx');
ok(!/authService/.test(authScreen), 'AuthScreen delegates service work to the auth controller hook');
ok(/useAuthActions/.test(authScreen), 'AuthScreen uses the auth controller hook');
const onboardingForm = read('src/features/onboarding/components/OnboardingForm.tsx');
ok(!/onboardingService|supabase/i.test(onboardingForm), 'OnboardingForm has no Supabase/service dependency');
const authActions = read('src/features/auth/hooks/useAuthActions.ts');
ok(/authService/.test(authActions), 'auth controller hook owns the auth service dependency');
const onboardingHook = read('src/features/onboarding/hooks/useOnboarding.ts');
ok(/onboardingService/.test(onboardingHook), 'onboarding controller hook owns the onboarding service dependency');
ok(/getProfile\(userId\)/.test(onboardingHook), 'onboarding hook reloads persisted profile state');
const phase53Doc = read('docs/PHASE5.3A-AUTH-ONBOARDING-UI.md');
ok(/future native companion/i.test(phase53Doc), 'Phase 5.3A preserves the separate future native-watch boundary');
ok(/generic password-reset response/i.test(phase53Doc), 'Phase 5.3A documents account-enumeration-safe reset behavior');

const groupService = read('src/features/groups/groupService.ts');
ok(/join_group_by_invite/.test(groupService), 'group service joins through the authoritative invite RPC');
ok(!/from\(['"]group_members['"]\)\s*\.insert|from\(['"]group_members['"]\)\s*\.update|from\(['"]group_members['"]\)\s*\.delete/.test(groupService), 'group service does not directly mutate membership rows');
ok(/Promise\.all/.test(groupService), 'group service aggregates group metadata/member counts without a single-group assumption');
const useGroups = read('src/features/groups/hooks/useGroups.ts');
ok(/GroupSummary\[\]/.test(useGroups), 'group loading state is explicitly multi-group');
ok(/listGroups\(userId\)/.test(useGroups), 'group controller delegates loading to the service');
for (const rel of ['src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts']) {
  const source = read(rel);
  ok(!/supabase/i.test(source), `${rel} has no direct Supabase dependency`);
}
const groupDoc = read('docs/PHASE5.5A-GROUP-FOUNDATION.md');
ok(/no new migration is required/i.test(groupDoc), 'Phase 5.5A documents reuse of existing group RLS/RPCs');
ok(/no CSS is added/i.test(groupDoc), 'Phase 5.5A preserves CSS separation before group UI');
const roadmap = read('docs/ROADMAP.md');
ok(/Profile pictures only; this is not an avatar\/customization system/i.test(roadmap), 'roadmap distinguishes profile pictures from avatars');

const domainRules = read('docs/DOMAIN-RULES.md');
ok(/lifting-v1/.test(domainRules), 'domain source of truth names lifting-v1');
ok(/50 lifting-workout XP|50 XP\/day max/i.test(domainRules), 'domain rules lock 50 lifting workout XP');
ok(/maximum daily exercise-completion XP = \*\*30\*\*/i.test(domainRules), 'domain rules lock 30 daily exercise XP');
ok(/maximum daily progression XP = \*\*30\*\*/i.test(domainRules), 'domain rules lock 30 daily progression XP');
ok(/highest cardio bonus.*15 XP\/day/i.test(domainRules), 'domain rules lock best-of-day cardio cap');
ok(/Maximum = \*\*125 XP per scoring date\*\*/i.test(domainRules), 'domain rules lock 125 daily total');
ok(/no weekly-improvement XP/i.test(domainRules), 'weekly improvement XP is removed');
ok(/Cardio.*do not count|Cardio.*does not.*weekly lifting target/i.test(domainRules), 'cardio does not satisfy weekly lifting target');

const globalCss = read('src/styles/global.css');
ok(globalCss.includes("@import './tokens.css'"), 'global CSS imports design tokens');
ok(globalCss.includes("@import './reset.css'"), 'global CSS imports reset');
ok(globalCss.includes("@import './base.css'"), 'global CSS imports base styles');
ok(globalCss.includes('@media (min-width: 1024px)'), 'desktop responsive breakpoint exists');
ok(globalCss.includes('.mobile-nav'), 'mobile bottom navigation styling exists');
ok(globalCss.includes('.desktop-sidebar'), 'desktop sidebar styling exists');
const cssArchitecture = read('docs/CSS-ARCHITECTURE.md');
ok(/component-specific selectors must not be added to `global\.css`/i.test(cssArchitecture), 'CSS architecture blocks new component styles in global CSS');

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
