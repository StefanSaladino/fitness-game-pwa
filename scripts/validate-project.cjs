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
  'README.md','CHANGELOG.md','docs/ROADMAP.md','docs/DOMAIN-RULES.md','docs/TESTING.md','docs/ARCHITECTURE.md','docs/DATABASE.md','docs/SUPABASE-SETUP.md','docs/ENVIRONMENT.md','docs/VALIDATION.md','docs/REFERENCES.md','docs/UI-DEVELOPMENT-GATE.md','docs/UI-ARCHITECTURE.md','docs/CSS-ARCHITECTURE.md','docs/PHASE5-ONBOARDING-FOUNDATION.md','docs/PHASE5.3A-AUTH-ONBOARDING-UI.md','docs/PHASE5.5A-GROUP-FOUNDATION.md','docs/PHASE5.5B-GROUP-SETUP-UI.md','docs/PHASE5.5C-PROFILE-PICTURES.md','.gitignore','.env.example',
  'supabase/migrations/20260818000100_initial_data_foundation.sql','supabase/migrations/20260818000200_phase5_onboarding_foundation.sql','supabase/migrations/20260819000100_lifting_first_scoring_foundation.sql','supabase/migrations/20260819000200_profile_pictures.sql','supabase/migrations/20260819000300_dashboard_read_models.sql','supabase/seed.sql',
  'supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql','supabase/tests/008_profile_pictures.test.sql','supabase/tests/009_dashboard_read_models.test.sql','supabase/tests/010_group_administration_permissions.test.sql',
  'src/domain/scoring/exerciseXp.ts','src/domain/scoring/cardioBonus.ts','src/domain/scoring/dailyXp.ts','src/styles/tokens.css','src/styles/reset.css','src/styles/base.css',
  'src/features/auth/authService.ts','src/features/auth/AuthProvider.tsx','src/features/auth/AuthScreen.tsx','src/features/auth/ResetPasswordScreen.tsx','src/features/auth/authValidation.ts','src/features/auth/authMessages.ts','src/features/auth/hooks/useAuthActions.ts','src/features/auth/components/AuthLayout.tsx','src/features/auth/components/SignInForm.tsx','src/features/auth/components/SignUpForm.tsx','src/features/auth/components/ForgotPasswordForm.tsx','src/features/auth/components/VerifyEmailPanel.tsx',
  'src/features/onboarding/model.ts','src/features/onboarding/validation.ts','src/features/onboarding/state.ts','src/features/onboarding/onboardingService.ts','src/features/onboarding/timezones.ts','src/features/onboarding/onboardingMessages.ts','src/features/onboarding/hooks/useOnboarding.ts','src/features/onboarding/components/OnboardingForm.tsx','src/features/onboarding/components/OnboardingScreen.tsx','src/features/onboarding/components/WeeklyTargetPicker.tsx',
  'src/features/groups/model.ts','src/features/groups/validation.ts','src/features/groups/groupMessages.ts','src/features/groups/groupService.ts','src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts','src/features/groups/hooks/usePendingGroupInvites.ts','src/features/groups/components/CreateGroupForm.tsx','src/features/groups/components/JoinGroupForm.tsx','src/features/groups/components/GroupSetupScreen.tsx','src/features/groups/components/GroupSetupController.tsx','src/features/groups/components/GroupGate.tsx','src/features/groups/components/GroupSetup.module.css','src/features/groups/components/GroupGate.module.css',
  'src/features/profile-picture/model.ts','src/features/profile-picture/validation.ts','src/features/profile-picture/profilePictureMessages.ts','src/features/profile-picture/profilePictureService.ts','src/features/profile-picture/hooks/useProfilePicture.ts','src/features/profile-picture/components/ProfilePicture.tsx','src/features/profile-picture/components/ProfilePictureManager.tsx','src/features/profile-picture/components/ProfilePicture.module.css','src/features/profile-picture/components/ProfilePictureManager.module.css',
  'src/features/dashboard/model.ts','src/features/dashboard/dashboardMath.ts','src/features/dashboard/dashboardMessages.ts','src/features/dashboard/dashboardService.ts','src/features/dashboard/hooks/useDashboard.ts','src/features/dashboard/components/DashboardController.tsx','src/features/dashboard/components/DashboardScreen.tsx','src/features/dashboard/components/DashboardScreen.module.css','docs/PHASE5.5D-LIFTING-DASHBOARD.md',
  'src/components/ui/Button.tsx','src/components/ui/Card.tsx','src/components/ui/Icon.tsx','src/components/ui/ProgressBar.tsx','src/components/ui/TextField.tsx','src/components/ui/SelectField.tsx',
  'src/components/layout/AppShell.tsx','src/components/layout/DesktopSidebar.tsx','src/components/layout/MobileNav.tsx','src/components/layout/PageHeader.tsx','src/components/layout/navigation.ts'
];
for (const rel of required) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);

const packageJson = JSON.parse(read('package.json'));
const packageLockJson = JSON.parse(read('package-lock.json'));
function versionAtLeast(actual, minimum) {
  const a = String(actual).split('.').map(Number);
  const b = String(minimum).split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) > (b[index] ?? 0)) return true;
    if ((a[index] ?? 0) < (b[index] ?? 0)) return false;
  }
  return true;
}
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

const profilePictureMigration = read('supabase/migrations/20260819000200_profile_pictures.sql');
ok(profilePictureMigration.includes('profile_picture_path'), 'profile-picture migration adds profile path reference');
ok(profilePictureMigration.includes("'profile-pictures'"), 'profile-picture migration creates/configures the storage bucket');
ok(profilePictureMigration.includes('2097152'), 'profile-picture storage is capped at 2 MiB');
ok(/image\/jpeg/.test(profilePictureMigration) && /image\/png/.test(profilePictureMigration) && /image\/webp/.test(profilePictureMigration), 'profile-picture bucket restricts supported MIME types');
ok(/profile_pictures_insert_own/.test(profilePictureMigration) && /profile_pictures_delete_own/.test(profilePictureMigration), 'profile-picture storage mutation policies exist');
ok(/storage\.foldername\(name\)/.test(profilePictureMigration), 'profile-picture storage policies scope objects by user folder');

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

for (const rel of ['supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql','supabase/tests/008_profile_pictures.test.sql','supabase/tests/009_dashboard_read_models.test.sql','supabase/tests/010_group_administration_permissions.test.sql','supabase/tests/011_workout_session_lifecycle.test.sql']) {
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
ok(/create_group_invite/.test(groupService) && /accept_group_invite/.test(groupService), 'group service uses recipient-targeted invite RPCs');
ok(!/from\(['"]group_members['"]\)\s*\.insert|from\(['"]group_members['"]\)\s*\.update|from\(['"]group_members['"]\)\s*\.delete/.test(groupService), 'group service does not directly mutate membership rows');
ok(/Promise\.all/.test(groupService), 'group service aggregates group metadata/member counts without a single-group assumption');
const useGroups = read('src/features/groups/hooks/useGroups.ts');
ok(/GroupSummary\[\]/.test(useGroups), 'group loading state is explicitly multi-group');
ok(/listGroups\(userId\)/.test(useGroups), 'group controller delegates loading to the service');
for (const rel of ['src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts','src/features/groups/hooks/usePendingGroupInvites.ts']) {
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



const groupSetupScreen = read('src/features/groups/components/GroupSetupScreen.tsx');
const createGroupForm = read('src/features/groups/components/CreateGroupForm.tsx');
const joinGroupForm = read('src/features/groups/components/JoinGroupForm.tsx');
const groupSetupController = read('src/features/groups/components/GroupSetupController.tsx');
const groupGate = read('src/features/groups/components/GroupGate.tsx');
const groupSetupCss = read('src/features/groups/components/GroupSetup.module.css');
const groupGateCss = read('src/features/groups/components/GroupGate.module.css');
const globalCssPhase55b = read('src/styles/global.css');
const appSource = read('src/app/App.tsx');
ok(!/supabase/i.test(groupSetupScreen), 'GroupSetupScreen has no Supabase dependency');
ok(!/supabase/i.test(createGroupForm), 'CreateGroupForm has no Supabase dependency');
ok(!/supabase/i.test(joinGroupForm), 'JoinGroupForm has no Supabase dependency');
ok(!/getSupabaseClient|createGroupService/.test(groupSetupController), 'GroupSetupController delegates through hooks');
ok(!/getSupabaseClient|createGroupService/.test(groupGate), 'GroupGate delegates group loading through useGroups');
ok(/validateCreateGroupInput/.test(createGroupForm), 'CreateGroupForm performs local pure validation');
ok(/validateInviteToken/.test(joinGroupForm), 'JoinGroupForm performs local invite normalization and validation');
ok(/useCreateGroup/.test(groupSetupController) && /usePendingGroupInvites/.test(groupSetupController) && !/useJoinGroup/.test(groupSetupController), 'GroupSetupController uses create + targeted pending-invite hooks');
ok(/useGroups/.test(groupGate), 'GroupGate uses the multi-group loader hook');
ok(/groups\.length === 0/.test(groupGate), 'GroupGate only requires setup for zero groups');
ok(/GroupGate/.test(appSource), 'App gates onboarded users through persisted group membership');
ok(!/group-setup|groupSetup|modeSwitch|principles/.test(globalCssPhase55b), 'Phase 5.5B group selectors are not added to global.css');
ok(groupSetupCss.length > 500 && groupGateCss.length > 100, 'Phase 5.5B feature styling is colocated in CSS Modules');
ok(/First real lifting dashboard — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks the real lifting dashboard complete');


const profilePictureService = read('src/features/profile-picture/profilePictureService.ts');
const profilePictureComponent = read('src/features/profile-picture/components/ProfilePicture.tsx');
const profilePictureManager = read('src/features/profile-picture/components/ProfilePictureManager.tsx');
const profilePictureCss = read('src/features/profile-picture/components/ProfilePicture.module.css');
const profilePictureManagerCss = read('src/features/profile-picture/components/ProfilePictureManager.module.css');
ok(/PROFILE_PICTURE_BUCKET = 'profile-pictures'/.test(profilePictureService), 'profile-picture service targets the dedicated bucket');
ok(/upsert: false/.test(profilePictureService), 'profile-picture replacement avoids storage upsert');
ok(/profile_picture_path/.test(profilePictureService), 'profile-picture service persists only the profile path reference');
ok(!/supabase/i.test(profilePictureComponent), 'ProfilePicture presentation has no Supabase dependency');
ok(!/supabase/i.test(profilePictureManager), 'ProfilePictureManager delegates through its hook rather than Supabase');
ok(/useProfilePicture/.test(profilePictureManager), 'ProfilePictureManager delegates async state to useProfilePicture');
ok(/\.module\.css/.test(read('src/features/profile-picture/components/ProfilePicture.tsx')) && profilePictureCss.length > 300 && profilePictureManagerCss.length > 500, 'profile-picture styling is colocated in CSS Modules');
ok(!/profilePicture|profile-picture|profile_picture/.test(read('src/styles/global.css')), 'profile-picture selectors are not added to global CSS');
ok(/profilePicturePath/.test(read('src/features/groups/model.ts')), 'group member identity carries profile-picture path');
ok(/Profile pictures — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks profile pictures complete');
ok(/not.*avatar|no avatar/i.test(read('docs/PHASE5.5C-PROFILE-PICTURES.md')), 'profile-picture phase explicitly excludes avatars');



const dashboardMigration = read('supabase/migrations/20260819000300_dashboard_read_models.sql');
const dashboardService = read('src/features/dashboard/dashboardService.ts');
const dashboardScreen = read('src/features/dashboard/components/DashboardScreen.tsx');
const dashboardCss = read('src/features/dashboard/components/DashboardScreen.module.css');
const dashboardHook = read('src/features/dashboard/hooks/useDashboard.ts');
ok(/get_group_lifting_leaderboard/.test(dashboardMigration), 'dashboard migration adds group leaderboard RPC');
ok(/is_active_group_member\(p_group_id\)/.test(dashboardMigration), 'leaderboard RPC requires active group membership');
ok(/scoring_version = 'lifting-v1'/.test(dashboardMigration), 'leaderboard aggregates only lifting-v1 scoring events');
ok(/revoke all on function public\.get_group_lifting_leaderboard/.test(dashboardMigration), 'leaderboard RPC revokes public execution');
ok(/event_type === 'LIFTING_WORKOUT'/.test(dashboardService), 'dashboard weekly progress reads authoritative lifting-v1 scoring dates');
ok(/exercise_progress/.test(dashboardService), 'dashboard reads exercise progress snapshots for PRs');
ok(/get_group_lifting_leaderboard/.test(dashboardService), 'dashboard service uses the guarded leaderboard RPC');
ok(/useDashboard/.test(read('src/features/dashboard/components/DashboardController.tsx')), 'dashboard controller delegates async reads to useDashboard');
ok(!/supabase/i.test(dashboardScreen), 'dashboard presentation has no Supabase dependency');
ok(!/getSupabaseClient|createDashboardService/.test(dashboardScreen), 'dashboard presentation does not own service creation');
ok(/DashboardScreen\.module\.css/.test(read('src/features/dashboard/components/DashboardScreen.tsx')) && dashboardCss.length > 1000, 'dashboard styling is colocated in a CSS Module');
ok(!/dashboardScreen|weekSummary|xpBreakdown|leaderboardRows/.test(read('src/styles/global.css')), 'Phase 5.5D selectors are not added to global CSS');
ok(/Cardio bonus/.test(dashboardScreen), 'dashboard exposes cardio only as a bonus category');
ok(!/level 14|unlock your potential|design principles|feature summary/i.test(dashboardScreen), 'dashboard avoids demo-only template filler');
ok(/createDashboardService/.test(dashboardHook), 'dashboard hook owns the dashboard service dependency');
ok(/First real lifting dashboard — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 5.5D completion');



const leaderboardPermissionHotfix = read('supabase/migrations/20260819000400_lock_down_dashboard_leaderboard.sql');
ok(/from anon/.test(leaderboardPermissionHotfix), 'dashboard leaderboard hotfix explicitly revokes anon execution');
ok(/to authenticated/.test(leaderboardPermissionHotfix), 'dashboard leaderboard hotfix grants authenticated execution');

const groupAdminPermissionMigration = read('supabase/migrations/20260819000500_group_administration_permissions.sql');
for (const fn of ['join_group_by_invite','remove_group_member','set_group_member_role','transfer_group_ownership','leave_group']) {
  ok(groupAdminPermissionMigration.includes(`public.${fn}`), `Phase 5.6 permission migration covers ${fn}`);
}
ok((groupAdminPermissionMigration.match(/from anon/g) || []).length === 5, 'Phase 5.6 explicitly revokes anon execution from every group mutation RPC');
ok((groupAdminPermissionMigration.match(/to authenticated/g) || []).length === 5, 'Phase 5.6 grants every group mutation RPC only to authenticated clients');

const groupAdministrationScreen = read('src/features/groups/components/GroupAdministrationScreen.tsx');
const groupAdministrationCss = read('src/features/groups/components/GroupAdministrationScreen.module.css');
const groupAdministrationHook = read('src/features/groups/hooks/useGroupAdministration.ts');
const productController = read('src/features/product/ProductController.tsx');
ok(!/supabase/i.test(groupAdministrationScreen), 'group administration presentation has no Supabase dependency');
ok(/ProfilePicture/.test(groupAdministrationScreen), 'group administration reuses real profile pictures');
ok(/Make admin/.test(groupAdministrationScreen) && /Transfer ownership/.test(groupAdministrationScreen), 'owner role controls are represented in group administration');
ok(/Leave group/.test(groupAdministrationScreen), 'non-owner leave flow is represented in group administration');
ok(/listInvites/.test(groupAdministrationHook) && /canManage=group\.role==='OWNER'\|\|group\.role==='ADMIN'/.test(groupAdministrationHook), 'outgoing invite administration is only loaded for owner/admin roles');
ok(/setMemberRole/.test(groupAdministrationHook) && /transferOwnership/.test(groupAdministrationHook), 'group administration hook delegates role/ownership mutations to the service');
ok(/activeSection/.test(productController) && /selectedGroupId/.test(productController), 'ProductController owns section and selected-group navigation state');
ok(/DashboardController/.test(productController) && /GroupAdministrationController/.test(productController), 'ProductController composes dashboard and group administration views');
ok(groupAdministrationCss.length > 1500, 'group administration styling is substantial and colocated in a CSS Module');
ok(!/memberRow|inviteRow|renameForm|groupAdministration/.test(read('src/styles/global.css')), 'Phase 5.6 selectors are not added to global CSS');
ok(/Group administration UI — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks Phase 5.6 group administration complete');



const phase57Integration = read('tests/integration/group-product-journey.test.tsx');
const dashboardControllerPhase57 = read('src/features/dashboard/components/DashboardController.tsx');
const productControllerPhase57 = read('src/features/product/ProductController.tsx');
ok(/dashboardService\?: DashboardService/.test(productControllerPhase57), 'ProductController exposes optional dashboard-service injection for integration validation');
ok(/groupService\?: GroupService/.test(productControllerPhase57), 'ProductController exposes optional group-service injection for integration validation');
ok(/service\?: DashboardService/.test(dashboardControllerPhase57), 'DashboardController exposes optional dashboard-service injection');
ok(/useDashboard\([\s\S]*service\)/.test(dashboardControllerPhase57), 'DashboardController forwards the injected service to useDashboard');
ok(/OnboardingToGroupHarness/.test(phase57Integration), 'Phase 5.7 covers onboarding into group gating');
ok(/Create group/.test(phase57Integration) && /Your lifting week/.test(phase57Integration), 'Phase 5.7 covers create-group into dashboard');
ok(/invite/i.test(phase57Integration), 'Phase 5.7 retains a group invitation journey');
ok(/Make admin/.test(phase57Integration), 'Phase 5.7 covers owner administration across the integrated journey');
const phase57CoversMemberPermissions =
  /member dashboard without admin controls/.test(phase57Integration) &&
  /Send invite/.test(phase57Integration) &&
  /Leave group/.test(phase57Integration);

ok(
  phase57CoversMemberPermissions,
  'Phase 5.7 covers member permission presentation',
);
ok(/Phase 5 integration validation — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks Phase 5.7 integration validation complete');
const integrationVitestConfig = read('vitest.integration.config.ts');
const packageJsonPhase57 = read('package.json');
const groupHooksPhase57 = read('src/features/groups/hooks/groupHooks.test.tsx');
ok(/tests\/integration\/\*\*\/\*\.test/.test(integrationVitestConfig), 'integration Vitest config explicitly discovers tests/integration');
ok(/vitest run --config vitest\.integration\.config\.ts/.test(packageJsonPhase57), 'test:integration uses the dedicated integration Vitest config');
ok(/role: 'MEMBER' as const/.test(groupHooksPhase57), 'group hook regression mock preserves the GroupRole literal type');



const workoutLifecycleMigration = read('supabase/migrations/20260819000600_workout_session_lifecycle.sql');
const workoutService = read('src/features/workout/workoutService.ts');
const workoutHook = read('src/features/workout/hooks/useActiveWorkout.ts');
const workoutScreen = read('src/features/workout/components/WorkoutSessionScreen.tsx');
const workoutCss = read('src/features/workout/components/WorkoutSessionScreen.module.css');
const productControllerPhase61 = read('src/features/product/ProductController.tsx');
ok(/workout_sessions_one_active_in_app_lift/.test(workoutLifecycleMigration), 'Phase 6.1 enforces one active in-app lifting session per user');
ok(/start_or_resume_lifting_workout/.test(workoutLifecycleMigration), 'Phase 6.1 adds idempotent start/resume RPC');
ok(/pause_lifting_workout/.test(workoutLifecycleMigration) && /resume_lifting_workout/.test(workoutLifecycleMigration), 'Phase 6.1 persists pause/resume through RPCs');
ok(/revoke insert, update, delete on public\.workout_sessions from authenticated/.test(workoutLifecycleMigration), 'Phase 6.1 blocks direct authenticated session mutation');
ok((workoutLifecycleMigration.match(/from public, anon, authenticated/g) || []).length === 5, 'Phase 6.1 lifecycle RPCs revoke default/public execution');
ok((workoutLifecycleMigration.match(/grant execute on function public\.[^(]+\([^)]*\) to authenticated/g) || []).length === 5, 'Phase 6.1 lifecycle RPCs grant authenticated execution');
ok(/loadActiveWorkout/.test(workoutService) && /status', 'IN_PROGRESS'/.test(workoutService), 'workout service recovers only active sessions');
ok(/start_or_resume_lifting_workout/.test(workoutService) && /finish_lifting_workout/.test(workoutService), 'workout service delegates lifecycle writes to authoritative RPCs');
ok(/useActiveWorkout/.test(read('src/features/workout/components/WorkoutController.tsx')), 'workout controller delegates async lifecycle state to useActiveWorkout');
ok(!/supabase/i.test(workoutScreen), 'workout presentation has no Supabase dependency');
ok(/pausedAt/.test(workoutScreen) && /Resume timer/.test(workoutScreen), 'workout presentation represents persisted pause/resume state');
ok(/WorkoutSessionScreen\.module\.css/.test(read('src/features/workout/components/WorkoutSessionScreen.tsx')) && workoutCss.length > 1200, 'workout styling is colocated in a CSS Module');
ok(!/WorkoutSessionScreen|activeHeader|exerciseStage|sessionMeta/.test(read('src/styles/global.css')), 'Phase 6.1 selectors are not added to global CSS');
ok(/activeSection === 'workouts'/.test(productControllerPhase61) && /WorkoutController/.test(productControllerPhase61), 'ProductController composes the Workouts surface');
ok(/Start Lift/.test(read('src/features/dashboard/components/DashboardScreen.tsx')), 'dashboard exposes the Start Lift entry point');
ok(/Session lifecycle foundation — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.1A completion');



const workoutCompositionMigration = read('supabase/migrations/20260819000800_workout_exercise_composition.sql');
const workoutCompositionService = read('src/features/workout/workoutExerciseService.ts');
const workoutCompositionHook = read('src/features/workout/hooks/useWorkoutExercises.ts');
const workoutCompositionScreen = read('src/features/workout/components/WorkoutSessionScreen.tsx');
const workoutCompositionCss = read('src/features/workout/components/WorkoutSessionScreen.module.css');
const workoutControllerPhase61b = read('src/features/workout/components/WorkoutController.tsx');
const productControllerPhase61b = read('src/features/product/ProductController.tsx');
ok(/workout_exercises_one_canonical_per_workout/.test(workoutCompositionMigration), 'Phase 6.1B enforces one canonical exercise per workout');
ok(/add_lifting_workout_exercise/.test(workoutCompositionMigration), 'Phase 6.1B adds guarded exercise attachment');
ok(/remove_lifting_workout_exercise/.test(workoutCompositionMigration), 'Phase 6.1B adds guarded exercise removal');
ok(/move_lifting_workout_exercise/.test(workoutCompositionMigration), 'Phase 6.1B adds guarded exercise reordering');
ok(/revoke insert, update, delete on public\.workout_exercises from authenticated/.test(workoutCompositionMigration), 'Phase 6.1B blocks direct workout-exercise mutation');
ok((workoutCompositionMigration.match(/from public, anon, authenticated/g) || []).length === 3, 'Phase 6.1B composition RPCs revoke default/public execution');
ok((workoutCompositionMigration.match(/grant execute on function public\.(?:add|remove|move)_lifting_workout_exercise/g) || []).length === 3, 'Phase 6.1B grants composition RPCs only to authenticated clients');
ok(/loadWorkoutExercises/.test(workoutCompositionService) && /order_index/.test(workoutCompositionService), 'composition service reloads persisted exercise order');
ok(/add_lifting_workout_exercise/.test(workoutCompositionService) && /remove_lifting_workout_exercise/.test(workoutCompositionService) && /move_lifting_workout_exercise/.test(workoutCompositionService), 'composition service delegates writes to authoritative RPCs');
ok(/exercise_catalog/.test(workoutCompositionService) && /canonical_name/.test(workoutCompositionService), 'composition service resolves canonical catalog identity');
ok(/useWorkoutExercises/.test(workoutControllerPhase61b), 'workout controller delegates composition state to useWorkoutExercises');
ok(/exerciseService\?: WorkoutExerciseService/.test(workoutControllerPhase61b), 'workout controller supports composition-service injection');
ok(/workoutExerciseService\?: WorkoutExerciseService/.test(productControllerPhase61b), 'product controller preserves composition-service injection for integration tests');
ok(!/supabase/i.test(workoutCompositionScreen), 'exercise composition presentation has no Supabase dependency');
ok(/Move \$\{exercise\.canonicalName\} up/.test(workoutCompositionScreen) && /Remove \$\{exercise\.canonicalName\}/.test(workoutCompositionScreen), 'active workout exposes accessible move/remove exercise controls');
ok(/exerciseList/.test(workoutCompositionCss) && /exerciseRow/.test(workoutCompositionCss), 'exercise composition styling is colocated in the workout CSS Module');
ok(!/exerciseList|exerciseRow|exerciseActions/.test(read('src/styles/global.css')), 'Phase 6.1B exercise selectors are not added to global CSS');
ok(/Exercise composition — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.1B completion');
ok(
  /Exercise picker integration — (?:NEXT|DONE)/.test(read('docs/ROADMAP.md')),
  'roadmap retains the exercise picker after exercise composition',
);
ok(/one canonical exercise may appear at most once/i.test(read('docs/PHASE6.1B-EXERCISE-COMPOSITION.md')), 'Phase 6.1B documents canonical exercise uniqueness');



const exercisePickerMigration = read('supabase/migrations/20260819000900_exercise_picker_catalog.sql');
const exercisePickerService = read('src/features/workout/exercisePickerService.ts');
const exerciseSearch = read('src/features/workout/exerciseSearch.ts');
const exercisePickerHook = read('src/features/workout/hooks/useExercisePickerCatalog.ts');
const exercisePicker = read('src/features/workout/components/ExercisePicker.tsx');
const exercisePickerCss = read('src/features/workout/components/ExercisePicker.module.css');
const workoutControllerPhase61c = read('src/features/workout/components/WorkoutController.tsx');
const productControllerPhase61c = read('src/features/product/ProductController.tsx');
ok(/primary_muscle_group/.test(exercisePickerMigration), 'Phase 6.1C persists primary muscle-group metadata');
ok(/workout_type/.test(exercisePickerMigration), 'Phase 6.1C persists workout-type metadata');
ok(/aliases text\[\]/.test(exercisePickerMigration), 'Phase 6.1C persists exercise search aliases');
ok(/Romanian Deadlift[\s\S]*RDL/.test(exercisePickerMigration), 'exercise metadata includes RDL alias');
ok(/Overhead Press[\s\S]*OHP/.test(exercisePickerMigration), 'exercise metadata includes OHP alias');
ok(/'PLYOMETRIC'/.test(exercisePickerMigration) && /'KETTLEBELL'/.test(exercisePickerMigration), 'exercise metadata includes requested workout types');
ok(/get_exercise_picker_catalog/.test(exercisePickerMigration), 'Phase 6.1C adds authenticated picker catalog RPC');
ok(/w\.user_id = auth\.uid\(\)/.test(exercisePickerMigration), 'recent exercise history is scoped to auth.uid');
ok(/w\.status = 'COMPLETED'/.test(exercisePickerMigration), 'picker recents use completed workouts');
ok(/from public, anon, authenticated/.test(exercisePickerMigration) && /to authenticated/.test(exercisePickerMigration), 'picker RPC execution is authenticated-only');
ok((exercisePickerMigration.match(/\('(?:[^']|'')+',\s*'(?:WEIGHT_REPS|BODYWEIGHT_REPS|DURATION|OTHER)',\s*true,/g) || []).length >= 356, 'picker migration carries the complete 356-exercise catalogue');
ok(/get_exercise_picker_catalog/.test(exercisePickerService), 'picker service uses the guarded catalogue RPC');
ok(/loadCatalog/.test(exercisePickerHook) && /createExercisePickerService/.test(exercisePickerHook), 'picker hook owns asynchronous catalogue loading');
ok(/levenshtein/.test(exerciseSearch), 'exercise search implements deterministic typo tolerance');
ok(/aliases/.test(exerciseSearch), 'exercise search ranks canonical aliases');
ok(/muscleGroup/.test(exerciseSearch) && /workoutType/.test(exerciseSearch), 'exercise search combines muscle and workout-type filters');
ok(/groupExercises/.test(exerciseSearch) && /ExerciseBrowseMode/.test(exerciseSearch), 'exercise search groups by the selected browse taxonomy');
ok(/MuscleGroupSelector/.test(exercisePicker) && /Search all exercises/.test(exercisePicker), 'picker exposes muscle-group navigation and all-exercise search');
ok(/SelectField label="Workout type"/.test(exercisePicker) && /view === 'muscle'/.test(exercisePicker), 'workout type remains text-first inside muscle-group detail screens');
ok(/Recent/.test(exercisePicker) && /recentExercises/.test(exercisePicker), 'picker includes a user-specific recent exercise section');
ok(/already added/.test(exercisePicker), 'picker visibly blocks duplicate exercise adds');
ok(/document\.documentElement\.style\.overflow = 'hidden'/.test(exercisePicker), 'picker locks background scroll while open');
ok(/event\.key !== 'Escape'/.test(exercisePicker) && /goHome/.test(exercisePicker), 'Escape navigates back from detail before closing the top-level picker');
ok(!/supabase/i.test(exercisePicker), 'exercise picker presentation has no Supabase dependency');
ok(exercisePickerCss.length > 1800, 'exercise picker styling is substantial and colocated in a CSS Module');
ok(!/exercisePicker|resultRow|browseSwitch/.test(read('src/styles/global.css')), 'Phase 6.1C picker selectors are not added to global CSS');
ok(/pickerService\?: ExercisePickerService/.test(workoutControllerPhase61c), 'workout controller supports picker-service injection');
ok(/exercisePickerService\?: ExercisePickerService/.test(productControllerPhase61c), 'product controller preserves picker-service injection for integration tests');
ok(/Exercise picker integration — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks exercise picker integration complete');
ok(/Exercise search — CORE DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks core exercise search complete');


// Phase 6.1C.1 / 6.1C.2 — muscle-group navigation + timer intent sync
const muscleGroupFilter = read('src/features/workout/components/MuscleGroupFilter.tsx');
const muscleGroupFilterCss = read('src/features/workout/components/MuscleGroupFilter.module.css');
const phase61c1Migration = read('supabase/migrations/20260819001000_oblique_muscle_group.sql');
const phase61c1SqlTest = read('supabase/tests/015_muscle_group_icon_taxonomy.test.sql');
const timerIntentMigration = read('supabase/migrations/20260819001200_workout_timer_intent_sync.sql');
const timerIntentTest = read('supabase/tests/017_workout_timer_intent_sync.test.sql');
const workoutScreenPhase61c2 = read('src/features/workout/components/WorkoutSessionScreen.tsx');
const workoutServicePhase61c2 = read('src/features/workout/workoutService.ts');
const phase61c1IconDir = path.join(root, 'src/assets/muscle-groups');
const phase61c1Icons = fs.readdirSync(phase61c1IconDir).filter((name) => name.endsWith('.png'));
const phase61c1Plan = Number((phase61c1SqlTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase61c1Count = (phase61c1SqlTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
const timerIntentPlan = Number((timerIntentTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const timerIntentCount = (timerIntentTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
ok(/MuscleGroupSelector/.test(muscleGroupFilter) && /onSelect/.test(muscleGroupFilter), 'muscle icons navigate into dedicated exercise-library screens');
ok(!/aria-pressed/.test(muscleGroupFilter), 'muscle-group navigation is not represented as a toggle filter');
ok(/Open \$\{MUSCLE_GROUP_LABELS\[group\]\} exercises/.test(muscleGroupFilter), 'muscle-group destinations expose descriptive accessible names');
ok(/grid-template-columns: repeat\(3/.test(muscleGroupFilterCss) && /grid-template-columns: repeat\(2/.test(muscleGroupFilterCss), 'muscle selector has phone-first responsive grid fallbacks');
ok(phase61c1Icons.length === 14, 'muscle selector ships 14 individual transparent PNG assets');
ok(/background-color: #0b0f14/.test(exercisePickerCss) && (exercisePickerCss.match(/background-color: #0b0f14/g) || []).length >= 2, 'picker panel and sticky surfaces use guaranteed opaque backgrounds');
ok(/Search all exercises/.test(exercisePicker) && /view === 'muscle'/.test(exercisePicker), 'picker preserves all-exercise search and dedicated muscle detail screens');
ok(/Back to exercise library/.test(exercisePicker) && /goHome/.test(exercisePicker), 'picker detail screens expose explicit back navigation');
ok(/SelectField label="Workout type"/.test(exercisePicker), 'muscle detail screens can narrow by workout type');
ok(/'OBLIQUES'/.test(phase61c1Migration) && /primary_muscle_group = 'OBLIQUES'/.test(phase61c1Migration), 'Phase 6.1C.1 adds real oblique taxonomy');
ok(Number.isInteger(phase61c1Plan) && phase61c1Plan === 6 && phase61c1Plan === phase61c1Count, 'Phase 6.1C.1 pgTAP plan matches 6 assertions');
ok(/start_or_resume_lifting_workout_intent/.test(timerIntentMigration) && /pause_lifting_workout_intent/.test(timerIntentMigration) && /resume_lifting_workout_intent/.test(timerIntentMigration), 'timer intent migration adds latency-aware lifecycle RPCs');
ok(/interval '15 seconds'/.test(timerIntentMigration) && /interval '2 seconds'/.test(timerIntentMigration), 'timer intent timestamps are accepted only inside a narrow server-time window');
ok(/start_or_resume_lifting_workout_intent/.test(workoutServicePhase61c2) && /pause_lifting_workout_intent/.test(workoutServicePhase61c2), 'workout service uses intent-aware lifecycle RPCs');
ok(!/loadById/.test(workoutServicePhase61c2), 'start/pause/resume no longer require a second session-select round trip');
ok(/startingAtMs/.test(workoutScreenPhase61c2) && /pauseIntentAtMs/.test(workoutScreenPhase61c2) && /resumeIntentAtMs/.test(workoutScreenPhase61c2), 'visible timer follows immediate start/pause/resume intent');
ok(Number.isInteger(timerIntentPlan) && timerIntentPlan === 16 && timerIntentPlan === timerIntentCount, 'timer intent pgTAP plan matches 16 assertions');
ok(/Picker drill-down \+ timer synchronization — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records picker/timer cleanup completion');
ok(/Set tracking — (?:NEXT|DONE)/.test(read('docs/ROADMAP.md')) && /every set is stored independently/.test(read('docs/ROADMAP.md')), 'roadmap retains the independent per-set requirement');
ok(!/muscleGroupFilter|selectedMark/.test(read('src/styles/global.css')), 'Phase 6.1C cleanup selectors are not added to global CSS');



// Phase 6.3 — per-set workout logging
const setTrackingMigration = read('supabase/migrations/20260819001300_workout_set_tracking.sql');
const setTrackingTest = read('supabase/tests/018_workout_set_tracking.test.sql');
const workoutSetService = read('src/features/workout/workoutSetService.ts');
const workoutSetHook = read('src/features/workout/hooks/useWorkoutSets.ts');
const workoutSetList = read('src/features/workout/components/WorkoutSetList.tsx');
const workoutSetCss = read('src/features/workout/components/WorkoutSetList.module.css');
const weightUnits = read('src/features/workout/weightUnits.ts');
const phase63Plan = Number((setTrackingTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase63Count = (setTrackingTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
ok(/bodyweight_mode/.test(setTrackingMigration), 'Phase 6.3 persists bodyweight loading mode per set');
ok(/add_lifting_workout_set/.test(setTrackingMigration) && /copy_lifting_workout_set/.test(setTrackingMigration), 'Phase 6.3 adds guarded add/copy set RPCs');
ok(/save_lifting_workout_set/.test(setTrackingMigration) && /remove_lifting_workout_set/.test(setTrackingMigration), 'Phase 6.3 adds guarded save/remove set RPCs');
ok(/revoke insert, update, delete on public\.workout_sets from authenticated/.test(setTrackingMigration), 'Phase 6.3 blocks direct workout-set mutation');
ok((setTrackingMigration.match(/from public, anon, authenticated/g) || []).length === 4, 'Phase 6.3 set RPCs revoke default/public execution');
ok((setTrackingMigration.match(/grant execute on function public\.(?:add|copy|save|remove)_lifting_workout_set/g) || []).length === 4, 'Phase 6.3 grants set RPCs only to authenticated clients');
ok(/loadWorkoutSets/.test(workoutSetService) && /set_number/.test(workoutSetService), 'set service reloads persisted independent set order');
ok(/add_lifting_workout_set/.test(workoutSetService) && /save_lifting_workout_set/.test(workoutSetService), 'set service delegates writes to authoritative RPCs');
ok(/useWorkoutSets/.test(read('src/features/workout/components/WorkoutController.tsx')), 'workout controller delegates set state to useWorkoutSets');
ok(/workoutSetService\?: WorkoutSetService/.test(read('src/features/product/ProductController.tsx')), 'product controller preserves set-service injection for integration tests');
ok(/Copy last set/.test(workoutSetList) && /Mark set \$\{set\.setNumber\} complete/.test(workoutSetList), 'set UI supports fast copy and independent completion');
ok(/ADDED_WEIGHT/.test(workoutSetList) && /ASSISTED/.test(workoutSetList), 'set UI distinguishes bodyweight loading modes');
ok(/displayWeightToKg/.test(weightUnits) && /kgToDisplayWeight/.test(weightUnits), 'weight display conversion preserves canonical kilograms');
ok(workoutSetCss.length > 1200, 'set-entry styling is substantial and colocated in a CSS Module');
ok(!/WorkoutSetList|setRow|setStage|completeButton/.test(read('src/styles/global.css')), 'Phase 6.3 selectors are not added to global CSS');
ok(Number.isInteger(phase63Plan) && phase63Plan === 34 && phase63Plan === phase63Count, 'Phase 6.3 pgTAP plan matches 34 assertions');
ok(/Set tracking — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.3 completion');
ok(/Workout reliability — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4 reliability completion');
ok(/does not add or change lifting-v1 XP reconciliation/i.test(read('docs/PHASE6.3-SET-TRACKING.md')), 'Phase 6.3 explicitly leaves XP persistence unchanged');


// Phase 6.4A — local active-workout recovery
for (const rel of [
  'src/features/workout/recovery/workoutRecoveryModel.ts',
  'src/features/workout/recovery/workoutRecoveryStorage.ts',
  'src/features/workout/hooks/useWorkoutRecovery.ts',
  'src/features/workout/components/WorkoutController.test.tsx',
  'src/features/workout/recovery/workoutRecoveryModel.test.ts',
  'src/features/workout/recovery/workoutRecoveryStorage.test.ts',
  'src/features/workout/hooks/useWorkoutRecovery.test.tsx',
  'docs/PHASE6.4A-LOCAL-WORKOUT-RECOVERY.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const recoveryModel = read('src/features/workout/recovery/workoutRecoveryModel.ts');
const recoveryStorage = read('src/features/workout/recovery/workoutRecoveryStorage.ts');
const recoveryHook = read('src/features/workout/hooks/useWorkoutRecovery.ts');
const recoveryController = read('src/features/workout/components/WorkoutController.tsx');
const recoveryScreen = read('src/features/workout/components/WorkoutSessionScreen.tsx');
const recoverySetList = read('src/features/workout/components/WorkoutSetList.tsx');
const recoveryDoc = read('docs/PHASE6.4A-LOCAL-WORKOUT-RECOVERY.md');
ok(/WORKOUT_RECOVERY_VERSION = 1/.test(recoveryModel), 'Phase 6.4A versions the local recovery contract');
ok(/WorkoutRecoverySessionSnapshot/.test(recoveryModel) && /WorkoutRecoveryExerciseSnapshot/.test(recoveryModel) && /WorkoutRecoverySetSnapshot/.test(recoveryModel), 'recovery snapshot uses explicit local contracts instead of database row shapes');
ok(!/supabase/i.test(recoveryModel), 'pure recovery model has no Supabase dependency');
ok(/fitness-game:active-workout:v1:/.test(recoveryStorage), 'recovery storage is versioned and namespaced');
ok(/parseWorkoutRecoverySnapshot/.test(recoveryStorage) && /removeItem/.test(recoveryStorage), 'invalid local recovery snapshots are discarded');
ok(!/supabase/i.test(recoveryStorage), 'local recovery storage has no Supabase dependency');
ok(/addEventListener\('online'/.test(recoveryHook) && /addEventListener\('offline'/.test(recoveryHook), 'recovery hook owns browser connectivity state');
ok(/reconnectCount/.test(recoveryHook) && /captureCanonical/.test(recoveryHook), 'recovery hook exposes one-shot reconnect and canonical capture orchestration');
ok(/restoreWorkoutSession/.test(recoveryController) && /restoreWorkoutExercises/.test(recoveryController) && /restoreWorkoutSets/.test(recoveryController), 'workout controller can present a complete local workout snapshot');
ok(/useRecoveredWorkout/.test(recoveryController) && /useRecoveredExercises/.test(recoveryController) && /useRecoveredSets/.test(recoveryController), 'controller explicitly chooses local fallback boundaries');
ok(/captureCanonical/.test(recoveryController) && /workout\.status === 'ready' && workout\.activeWorkout === null/.test(recoveryController), 'authoritative remote reads refresh or clear local recovery state');
ok(/Offline workout copy/.test(recoveryScreen) && /Recovering workout/.test(recoveryScreen) && /Local workout copy/.test(recoveryScreen), 'workout presentation exposes explicit recovery states');
ok(/serverMutationsEnabled/.test(recoveryScreen) && /serverMutationsEnabled/.test(recoverySetList), 'server-only workout mutations are gated while using a local recovery copy');
ok(/recoveryDrafts/.test(recoverySetList) && /onDraftChange/.test(recoverySetList), 'set entry hydrates and persists unsaved local drafts');
ok(!/localStorage|supabase/i.test(recoveryScreen), 'workout presentation does not own persistence');
ok(!/recoveryNotice/.test(read('src/styles/global.css')), 'Phase 6.4A recovery styling is not added to global CSS');
ok(/6\.4A Local active-workout recovery — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4A completion');
ok(/6\.4B Idempotent workout mutation queue — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4B queue completion');
ok(/no general mutation queue/i.test(recoveryDoc) && /no lifting-v1 scoring changes/i.test(recoveryDoc), 'Phase 6.4A documents its reliability non-goals');


// Phase 6.4B — idempotent workout mutation queue
for (const rel of [
  'src/features/workout/mutations/workoutMutationModel.ts',
  'src/features/workout/mutations/workoutMutationStorage.ts',
  'src/features/workout/mutations/workoutMutationService.ts',
  'src/features/workout/mutations/workoutMutationReplay.ts',
  'src/features/workout/hooks/useWorkoutMutationQueue.ts',
  'supabase/migrations/20260820000100_idempotent_workout_mutations.sql',
  'supabase/tests/019_idempotent_workout_mutations.test.sql',
  'docs/PHASE6.4B-IDEMPOTENT-WORKOUT-MUTATIONS.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const mutationModel = read('src/features/workout/mutations/workoutMutationModel.ts');
const mutationStorage = read('src/features/workout/mutations/workoutMutationStorage.ts');
const mutationService = read('src/features/workout/mutations/workoutMutationService.ts');
const mutationReplay = read('src/features/workout/mutations/workoutMutationReplay.ts');
const mutationHook = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
const mutationMigration = read('supabase/migrations/20260820000100_idempotent_workout_mutations.sql');
const mutationTest = read('supabase/tests/019_idempotent_workout_mutations.test.sql');
const mutationDoc = read('docs/PHASE6.4B-IDEMPOTENT-WORKOUT-MUTATIONS.md');
const phase64bPlan = Number((mutationTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase64bCount = (mutationTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
ok(/WORKOUT_MUTATION_QUEUE_VERSION = 1/.test(mutationModel), 'Phase 6.4B versions the queued mutation contract');
ok(/ADD_EXERCISE/.test(mutationModel) && /SAVE_SET/.test(mutationModel) && /REMOVE_SET/.test(mutationModel), 'mutation model covers exercise and set capture writes');
ok(/classifyWorkoutMutationError/.test(mutationModel) && /retryable/.test(mutationModel) && /terminal/.test(mutationModel), 'mutation model distinguishes retryable and terminal failures');
ok(!/React|Supabase|localStorage/.test(mutationModel), 'pure mutation model has no React, Supabase, or browser-storage dependency');
ok(/fitness-game:workout-mutations:v1:/.test(mutationStorage), 'mutation queue storage is versioned and per-user namespaced');
ok(/parseWorkoutMutationQueue/.test(mutationStorage) && /removeItem/.test(mutationStorage), 'invalid mutation queues are discarded instead of replayed');
ok(/while \(queue\.length > 0\)/.test(mutationReplay) && /queue\.shift\(\)/.test(mutationReplay), 'mutation replay preserves FIFO ordering');
ok(/kind === 'conflict'/.test(mutationReplay) && /WorkoutMutationQueueItemStatus = 'pending' \| 'failed' \| 'conflict'/.test(mutationModel), 'replay preserves explicit conflicts separately from terminal and retryable failures');
ok(/apply_lifting_workout_mutation/.test(mutationService) && /p_idempotency_key/.test(mutationService), 'client mutation service uses the explicit idempotent RPC boundary');
ok(/storageRef\.current!\.save\(userId, next\)/.test(mutationHook) && /await replay\(\)/.test(mutationHook), 'queue persists a mutation before attempting replay');
ok(/addEventListener\('online'/.test(mutationHook), 'queued workout writes automatically retry after reconnect');
ok(/retryBlocked/.test(mutationHook) && /status: 'pending' as const/.test(mutationHook), 'blocked queued writes require an explicit user retry before replay');
ok(/useWorkoutMutationQueue/.test(recoveryController) && /mutationQueue\.executor/.test(recoveryController), 'workout controller injects one queue executor into capture hooks');
const productControllerPhase64b = read('src/features/product/ProductController.tsx');
ok(
  /workoutMutationService\s*\?\s*:\s*WorkoutMutationService/.test(productControllerPhase64b)
    && /mutationService\s*=\s*\{\s*workoutMutationService\s*\}/.test(productControllerPhase64b),
  'product controller preserves mutation-service injection for integration tests',
);
ok(/mutationExecutor\?/.test(workoutSetHook) && /mutationExecutor\?/.test(read('src/features/workout/hooks/useWorkoutExercises.ts')), 'exercise and set hooks support the queue orchestration boundary');
ok(/mutationQueuePendingCount/.test(recoveryScreen) && /Workout sync needs attention/.test(recoveryScreen), 'workout presentation exposes queued and blocked sync states');
ok(/setEditsEnabled/.test(recoverySetList), 'existing set edits remain separately controllable from structural offline mutations');
ok(!/queueNotice/.test(read('src/styles/global.css')), 'Phase 6.4B queue styling remains colocated outside global CSS');
ok(/create table if not exists public\.workout_mutation_receipts/.test(mutationMigration), 'database stores durable per-user mutation receipts');
ok(/primary key \(user_id, idempotency_key\)/.test(mutationMigration), 'idempotency uniqueness is scoped per user');
ok(/request_payload <> v_payload/.test(mutationMigration), 'same idempotency key cannot be reused with a different request');
ok(/apply_lifting_workout_mutation/.test(mutationMigration) && /grant execute on function public\.apply_lifting_workout_mutation/.test(mutationMigration), 'authenticated clients receive the idempotent mutation gateway');
ok(/add_lifting_workout_set/.test(mutationMigration) && /copy_lifting_workout_set/.test(mutationMigration) && /save_lifting_workout_set/.test(mutationMigration), 'idempotent gateway delegates set writes to guarded authoritative functions');
ok(Number.isInteger(phase64bPlan) && phase64bPlan === 26 && phase64bPlan === phase64bCount, 'Phase 6.4B pgTAP plan matches 26 assertions');
ok(/6\.4B Idempotent workout mutation queue — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4B completion');
ok(/6\.4C Conflict and destructive-edit safety — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4C conflict safety completion');
ok(/no scoring reconciliation/i.test(mutationDoc) && /no optimistic local exercise\/set creation/i.test(mutationDoc), 'Phase 6.4B documents scoring and conflict-safety non-goals');
ok(/Phase 6\.4B/.test(mutationDoc), 'Phase 6.4B keeps its historical checkpoint documentation');


// Phase 6.4C — conflict and destructive-edit safety
for (const rel of [
  'supabase/migrations/20260820000200_workout_conflict_safety.sql',
  'supabase/tests/020_workout_conflict_safety.test.sql',
  'docs/PHASE6.4C-CONFLICT-SAFETY.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const conflictMigration = read('supabase/migrations/20260820000200_workout_conflict_safety.sql');
const conflictTest = read('supabase/tests/020_workout_conflict_safety.test.sql');
const conflictDoc = read('docs/PHASE6.4C-CONFLICT-SAFETY.md');
const conflictExerciseService = read('src/features/workout/workoutExerciseService.ts');
const conflictSetService = read('src/features/workout/workoutSetService.ts');
const conflictScreen = read('src/features/workout/components/WorkoutSessionScreen.tsx');
const conflictActiveHook = read('src/features/workout/hooks/useActiveWorkout.ts');
const phase64cPlan = Number((conflictTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase64cCount = (conflictTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/revision: number/.test(read('src/features/workout/model.ts')), 'workout exercise/set view models expose revision tokens');
ok(/revision/.test(conflictExerciseService) && /revision/.test(conflictSetService), 'authoritative exercise and set reads include server revisions');
ok(/expectedRevision/.test(mutationModel) && /WorkoutMutationErrorKind = 'retryable' \| 'conflict' \| 'terminal'/.test(mutationModel), 'queued destructive writes carry optimistic-concurrency revisions and explicit conflict state');
ok(/WORKOUT_CONFLICT:/.test(mutationModel) && /WorkoutMutationQueueItemStatus = 'pending' \| 'failed' \| 'conflict'/.test(mutationModel), 'client model recognizes server conflict responses');
ok(/discardConflictingWorkout/.test(mutationHook), 'queue requires an explicit discard action for a conflicting workout');
ok(/Workout changed elsewhere/.test(conflictScreen) && /Use server version/.test(conflictScreen), 'workout presentation surfaces actionable conflict recovery');
ok(/clearDrafts/.test(recoveryHook) && /clearDrafts/.test(recoveryController), 'choosing the server version clears stale local set drafts');
ok(/setSetRevision/.test(recoveryHook) && /recovery\.setSetRevision/.test(recoveryController), 'queued offline set revisions persist across recovery restarts');
ok(/revisionCursor/.test(workoutSetHook), 'set hook advances revision expectations synchronously across rapid queued saves');
ok(/await load\(\)/.test(conflictActiveHook) && /finish/.test(conflictActiveHook) && /cancel/.test(conflictActiveHook), 'finish/cancel failures re-check authoritative active-workout state');
ok(/add column if not exists revision bigint not null default 0/.test(conflictMigration), 'database adds revision counters to workout capture rows');
ok(/bump_workout_row_revision/.test(conflictMigration), 'database increments row revisions on updates');
ok(/for update/.test(conflictMigration) && /v_current_revision <> v_expected_revision/.test(conflictMigration), 'conflict gateway locks rows before comparing expected revisions');
ok(/Workout is no longer active on the server/.test(conflictMigration), 'completed and cancelled workouts reject queued capture mutations as conflicts');
ok(/receipt/.test(conflictDoc) && /Legacy v0\.5\.2/.test(conflictDoc), 'conflict policy preserves exact idempotent replay and handles legacy queued writes safely');
ok(Number.isInteger(phase64cPlan) && phase64cPlan === 31 && phase64cPlan === phase64cCount, 'Phase 6.4C pgTAP plan matches 31 assertions');
ok(/6\.4C Conflict and destructive-edit safety — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4C completion');
ok(/6\.4D Reliability integration gate — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4D reliability integration completion');
ok(/Phase 6\.4C/.test(conflictDoc), 'Phase 6.4C keeps its historical checkpoint documentation');


// Phase 6.4D — reliability integration gate
for (const rel of [
  'tests/integration/workout-reliability-journey.test.tsx',
  'tests/e2e/workout-reliability.spec.ts',
  'tests/e2e/reliabilityHarness.tsx',
  'reliability.e2e.html',
  'supabase/tests/021_workout_reliability_gate.test.sql',
  'docs/PHASE6.4D-RELIABILITY-INTEGRATION-GATE.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const reliabilityIntegration = read('tests/integration/workout-reliability-journey.test.tsx');
const reliabilityE2e = read('tests/e2e/workout-reliability.spec.ts');
const reliabilityHarness = read('tests/e2e/reliabilityHarness.tsx');
const reliabilityDbTest = read('supabase/tests/021_workout_reliability_gate.test.sql');
const reliabilityDoc = read('docs/PHASE6.4D-RELIABILITY-INTEGRATION-GATE.md');
const reliabilityVite = read('vite.config.ts');
const reliabilityPlaywright = read('playwright.config.ts');
const phase64dPlan = Number((reliabilityDbTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase64dCount = (reliabilityDbTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/offline set edit/i.test(reliabilityDoc) && /refresh\/restart/i.test(reliabilityDoc) && /reconnect/i.test(reliabilityDoc), 'Phase 6.4D documents the complete offline recovery journey');
ok(/setOnline\(false\)/.test(reliabilityIntegration) && /firstRender\.unmount\(\)/.test(reliabilityIntegration) && /setOnline\(true\)/.test(reliabilityIntegration), 'integration gate covers offline edit, restart, and reconnect');
ok(/failAfterCommitOnce\('ADD_SET'\)/.test(reliabilityIntegration) && /new Set\(backend\.mutationCalls\)/.test(reliabilityIntegration), 'integration gate proves ambiguous retry reuses one idempotency key');
ok(/mutateSetElsewhere/.test(reliabilityIntegration) && /Use server version/.test(reliabilityIntegration), 'integration gate proves stale writes require explicit server recovery');
ok(/raceLifecycle/.test(reliabilityIntegration) && /Finish workout/.test(reliabilityIntegration) && /Cancel workout/.test(reliabilityIntegration), 'integration gate covers finish and cancel races');
ok(/FITNESS_E2E_RELIABILITY/.test(reliabilityVite) && /FITNESS_E2E_RELIABILITY/.test(reliabilityPlaywright), 'browser reliability fixture is included only for the E2E build');
ok(/Offline workout copy/.test(reliabilityE2e) && /Workout changed elsewhere/.test(reliabilityE2e), 'Playwright covers phone-first offline and conflict recovery states');
ok(/scrollWidth - window\.innerWidth/.test(reliabilityE2e), 'phone reliability E2E checks horizontal overflow');
ok(/ActiveWorkoutScreen/.test(reliabilityHarness) && /recoveryState=\{offline \? 'offline' : 'synced'\}/.test(reliabilityHarness), 'E2E harness renders the real workout recovery presentation');
ok(Number.isInteger(phase64dPlan) && phase64dPlan === 17 && phase64dPlan === phase64dCount, 'Phase 6.4D pgTAP plan matches 17 assertions');
ok(/no new migration/i.test(reliabilityDoc), 'Phase 6.4D remains a validation-only database slice');
ok(/6\.4D Reliability integration gate — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4D completion');
ok(/Phase 7 — Authoritative lifting-v1 scoring persistence — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 7 authoritative scoring completion');
ok(versionAtLeast(packageJson.version, '0.8.0') && versionAtLeast(packageLockJson.version, '0.8.0'), 'project metadata is at or beyond the v0.8.0 weekly-consistency checkpoint');


// Phase 7 — authoritative lifting-v1 scoring persistence
for (const rel of [
  'supabase/migrations/20260820000300_authoritative_lifting_scoring.sql',
  'supabase/tests/022_authoritative_lifting_scoring.test.sql',
  'docs/PHASE7-AUTHORITATIVE-LIFTING-SCORING.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase7Migration = read('supabase/migrations/20260820000300_authoritative_lifting_scoring.sql');
const phase7Test = read('supabase/tests/022_authoritative_lifting_scoring.test.sql');
const phase7Doc = read('docs/PHASE7-AUTHORITATIVE-LIFTING-SCORING.md');
const phase7Plan = Number((phase7Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase7Count = (phase7Test.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok((phase7Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 7 migration dollar-quote delimiters are balanced');
ok(/reconcile_lifting_v1_scoring_for_user/.test(phase7Migration) && /pg_advisory_xact_lock/.test(phase7Migration), 'Phase 7 serializes authoritative per-user reconciliation');
ok(/reconcile_my_lifting_v1_scoring/.test(phase7Migration) && /to authenticated/.test(phase7Migration), 'Phase 7 exposes only the self-scoped authenticated rebuild RPC');
ok(/revoke all on function public\.reconcile_lifting_v1_scoring_for_user\(uuid\) from public, anon, authenticated/.test(phase7Migration), 'clients cannot target another user for scoring reconciliation');
ok(/scoring_events_lifting_workout_unique[\s\S]*scoring_version/.test(phase7Migration) && /scoring_events_exercise_progress_unique[\s\S]*scoring_version/.test(phase7Migration), 'authoritative ledger uniqueness includes scoring version');
ok(/'LIFTING_WORKOUT'[\s\S]*50[\s\S]*'lifting-v1'/.test(phase7Migration), 'Phase 7 persists the locked 50-XP lifting award');
ok(/'EXERCISE_COMPLETE'[\s\S]*5[\s\S]*dailyExerciseCap/.test(phase7Migration), 'Phase 7 persists canonical 5-XP exercise completion with daily cap metadata');
ok(/completed_working_sets[\s\S]*having count\(\*\) >= 2/.test(phase7Migration) && /daily_rank <= 6/.test(phase7Migration), 'exercise completion requires two working sets and caps at six exercises');
ok(/when 'RUNNING' then w\.active_duration_seconds >= 900/.test(phase7Migration) && /when 'WALKING_HIKING' then w\.active_duration_seconds >= 1800/.test(phase7Migration) && /when 'HIIT' then w\.active_duration_seconds >= 720/.test(phase7Migration), 'Phase 7 cardio qualification matches the current TypeScript oracle');
ok(/when w\.active_duration_seconds >= 2700 then 15/.test(phase7Migration) && /when w\.active_duration_seconds >= 1800 then 10/.test(phase7Migration), 'Phase 7 cardio tiers preserve 5/10/15 duration scoring');
ok(/ws\.reps between 1 and 12/.test(phase7Migration) && /ws\.weight_kg \* \(1 \+ ws\.reps::numeric \/ 30\)/.test(phase7Migration), 'weighted progression uses best-set Epley e1RM for 1-12 reps');
ok(/BODYWEIGHT_REPS/.test(phase7Migration) && /coalesce\(ws\.bodyweight_mode, 'BODYWEIGHT'\) = 'BODYWEIGHT'/.test(phase7Migration), 'plain bodyweight progression excludes added and assisted loading');
ok(/v_has_previous_best := found/.test(phase7Migration) && /qualifying_lifting_workout/.test(phase7Migration), 'first observation is baseline-only and progression requires a qualifying lift');
ok(/greatest\(0, 30 - v_daily_progression\)/.test(phase7Migration) && /dailyProgressionCap', 30/.test(phase7Migration), 'progression awards enforce the 30-XP daily ceiling');
ok(/having sum\(se\.amount\) > 125/.test(phase7Migration), 'Phase 7 has an executable 125-XP daily safety guard');
ok(/delete from public\.scoring_events[\s\S]*scoring_version = 'lifting-v1'/.test(phase7Migration) && /delete from public\.exercise_progress_observations/.test(phase7Migration), 'reconciliation replaces derived lifting-v1 state instead of stacking retries');
ok(/after insert or update or delete on public\.workout_sessions/.test(phase7Migration) && /after insert or update or delete on public\.workout_sets/.test(phase7Migration), 'completed source edits/deletes trigger authoritative rebuilds');
ok(/w\.source = 'IN_APP'/.test(phase7Migration) && /MANUAL/.test(phase7Doc) && /EXTERNAL/.test(phase7Doc), 'Phase 7 documents and enforces conservative automatic-scoring source policy');
ok(/best_weight_kg/.test(phase7Migration) && /best_reps/.test(phase7Migration), 'personal-best snapshots retain source weight and reps');
ok(Number.isInteger(phase7Plan) && phase7Plan === 32 && phase7Plan === phase7Count, 'Phase 7 pgTAP plan matches 32 assertions');
ok(/Phase 7 — Authoritative lifting-v1 scoring persistence — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 7 completion');
ok(/Phase 8 — Exercise progression engine \+ history — DONE/.test(read('docs/ROADMAP.md')), 'roadmap retains completed Phase 8 progression history');
ok(/full history rebuild/i.test(phase7Doc) && /historical edits and deletes/i.test(phase7Doc), 'Phase 7 documents downstream-safe historical reconciliation');


// Phase 8 — exercise progression engine + history
for (const rel of [
  'src/features/progress/model.ts',
  'src/features/progress/progressService.ts',
  'src/features/progress/hooks/useExerciseProgress.ts',
  'src/features/progress/components/ExerciseProgressController.tsx',
  'src/features/progress/components/ExerciseProgressScreen.tsx',
  'src/features/progress/components/ExerciseProgressScreen.module.css',
  'supabase/migrations/20260820000400_exercise_progress_history.sql',
  'supabase/tests/023_exercise_progress_history.test.sql',
  'docs/PHASE8-EXERCISE-PROGRESSION-HISTORY.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const progressHistoryMigration = read('supabase/migrations/20260820000400_exercise_progress_history.sql');
const progressHistoryTest = read('supabase/tests/023_exercise_progress_history.test.sql');
const progressHistoryService = read('src/features/progress/progressService.ts');
const progressHistoryHook = read('src/features/progress/hooks/useExerciseProgress.ts');
const progressHistoryScreen = read('src/features/progress/components/ExerciseProgressScreen.tsx');
const progressHistoryCss = read('src/features/progress/components/ExerciseProgressScreen.module.css');
const progressHistoryDoc = read('docs/PHASE8-EXERCISE-PROGRESSION-HISTORY.md');
const progressProductController = read('src/features/product/ProductController.tsx');
const phase8Plan = Number((progressHistoryTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase8Count = (progressHistoryTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/get_my_exercise_progress_overview/.test(progressHistoryMigration), 'Phase 8 adds the self-scoped exercise progression overview RPC');
ok(/get_my_exercise_progress_history/.test(progressHistoryMigration), 'Phase 8 adds the self-scoped exercise history RPC');
ok((progressHistoryMigration.match(/auth\.uid\(\)/g) || []).length >= 2, 'Phase 8 progression read models derive identity from auth.uid');
ok(!/p_user_id/.test(progressHistoryMigration), 'Phase 8 read models never accept another user id');
ok(/session_volume_kg_reps/.test(progressHistoryMigration) && /weight_kg \* ws\.reps/.test(progressHistoryMigration), 'Phase 8 exposes completed working-set volume for analytics');
ok(/previous_pr_value/.test(progressHistoryMigration) && /rows between unbounded preceding and 1 preceding/.test(progressHistoryMigration), 'Phase 8 derives prior PR context from earlier observations');
ok(/added_weight_sets/.test(progressHistoryMigration) && /assisted_sets/.test(progressHistoryMigration), 'Phase 8 retains bodyweight variants as explicit analytics');
ok(!/insert into public\.scoring_events|update public\.exercise_progress|delete from public\.scoring_events/i.test(progressHistoryMigration), 'Phase 8 read models do not mutate authoritative scoring state');
ok(/from public, anon, authenticated/.test(progressHistoryMigration) && (progressHistoryMigration.match(/to authenticated/g) || []).length === 2, 'Phase 8 RPC execution is authenticated-only');
ok(Number.isInteger(phase8Plan) && phase8Plan === 31 && phase8Plan === phase8Count, 'Phase 8 pgTAP plan matches 31 assertions');
ok(/get_my_exercise_progress_overview/.test(progressHistoryService) && /get_my_exercise_progress_history/.test(progressHistoryService), 'progress service delegates to guarded Phase 8 read models');
ok(/createExerciseProgressService/.test(progressHistoryHook) && /loadHistory/.test(progressHistoryHook), 'progress hook owns the progression service and selected-exercise history loading');
ok(!/supabase/i.test(progressHistoryScreen), 'progress presentation has no Supabase dependency');
ok(/Current PR/.test(progressHistoryScreen) && /Previous PR/.test(progressHistoryScreen), 'progress screen separates current and previous personal records');
ok(/Volume is analytics-only and never awards XP/.test(progressHistoryScreen), 'progress screen labels volume as non-scoring analytics');
ok(/Added-weight and assisted sets stay visible as analytics/.test(progressHistoryScreen), 'progress screen explains conservative bodyweight comparison rules');
ok(/activeItem="progress"/.test(progressHistoryScreen), 'Progress destination is represented as the active primary navigation section');
ok(/progressService\?: ExerciseProgressService/.test(progressProductController) && /activeSection === 'progress'/.test(progressProductController), 'ProductController composes the Progress section with injectable service boundary');
ok(progressHistoryCss.length > 2500, 'Phase 8 Progress styling is substantial and colocated in a CSS Module');
ok(!/exercisePanel|progressGrid|historyList/.test(read('src/styles/global.css')), 'Phase 8 Progress selectors are not added to global CSS');
ok(/Phase 8 — Exercise progression engine \+ history — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 8 progression history completion');
ok(/Phase 9 — Weekly lifting consistency \+ badges — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 9 weekly consistency and badges completion');
ok(/does not[\s\S]*change `lifting-v1` scoring/i.test(progressHistoryDoc), 'Phase 8 documentation preserves authoritative Phase 7 scoring rules');
ok(/no cross-user/i.test(progressHistoryDoc), 'Phase 8 documents personal-only progression comparison');


// Phase 9 — weekly lifting consistency + badges
for (const rel of [
  'src/features/consistency/model.ts',
  'src/features/consistency/badges.ts',
  'src/features/consistency/consistencyService.ts',
  'supabase/migrations/20260820000500_weekly_consistency_badges.sql',
  'supabase/tests/024_weekly_consistency_badges.test.sql',
  'docs/PHASE9-WEEKLY-CONSISTENCY-BADGES.md',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase9Migration = read('supabase/migrations/20260820000500_weekly_consistency_badges.sql');
const phase9Test = read('supabase/tests/024_weekly_consistency_badges.test.sql');
const phase9Doc = read('docs/PHASE9-WEEKLY-CONSISTENCY-BADGES.md');
const consistencyService = read('src/features/consistency/consistencyService.ts');
const badgeCatalog = read('src/features/consistency/badges.ts');
const phase9DashboardService = read('src/features/dashboard/dashboardService.ts');
const phase9DashboardScreen = read('src/features/dashboard/components/DashboardScreen.tsx');
const phase9DashboardCss = read('src/features/dashboard/components/DashboardScreen.module.css');
const phase9Plan = Number((phase9Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase9Count = (phase9Test.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok((phase9Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 9 migration dollar-quote delimiters are balanced');
ok(/create table if not exists public\.weekly_lifting_snapshots/.test(phase9Migration), 'Phase 9 persists completed-week lifting snapshots');
ok(/create table if not exists public\.lifting_consistency_state/.test(phase9Migration), 'Phase 9 persists completed-week streak state');
ok(/create table if not exists public\.user_badges/.test(phase9Migration), 'Phase 9 persists non-XP badges');
ok(/pending_weekly_workout_target_week_start/.test(phase9Migration) && /v_current_week_start \+ 7/.test(phase9Migration), 'scheduled weekly target changes persist their next-Monday boundary');
ok(/normalize_pending_weekly_target_boundary/.test(phase9Migration) && /profiles_normalize_pending_weekly_target_boundary/.test(phase9Migration), 'profile boundary keeps pending target and effective Monday paired across older writers');
ok(/event_type = 'LIFTING_WORKOUT'/.test(phase9Migration) && /scoring_version = 'lifting-v1'/.test(phase9Migration), 'weekly lifting days derive from the authoritative lifting-v1 ledger');
ok(/v_week < v_current_week_start/.test(phase9Migration), 'current in-progress week is excluded from completed-week snapshots');
ok(/current_completed_week_streak/.test(phase9Migration) && /best_completed_week_streak/.test(phase9Migration), 'Phase 9 maintains current and best completed-week streaks');
ok(/sync_lifting_badge/.test(phase9Migration) && /FIRST_PR/.test(phase9Migration) && /GOAL_STREAK_4/.test(phase9Migration), 'Phase 9 derives PR and consistency badge milestones');
ok(/CARDIO_BONUS_DAYS_5/.test(phase9Migration) && /event_type = 'CARDIO_BONUS'/.test(phase9Migration), 'cardio accessory badges remain separate from lifting-day consistency');
ok(!/insert into public\.scoring_events|update public\.scoring_events/i.test(phase9Migration), 'Phase 9 never writes XP/scoring events');
ok(/revoke all on public\.user_badges from public, anon, authenticated/.test(phase9Migration), 'authenticated clients cannot directly mutate badge state');
ok(/get_my_lifting_consistency_summary/.test(phase9Migration) && /auth\.uid\(\)/.test(phase9Migration), 'Phase 9 exposes a self-scoped authenticated consistency summary');
ok(/reconcile_weekly_lifting_consistency_for_user/.test(phase9Migration) && /pg_advisory_xact_lock/.test(phase9Migration), 'Phase 9 serializes authoritative per-user consistency reconciliation');
ok(/zz_weekly_consistency_workout_sessions/.test(phase9Migration) && /zz_weekly_consistency_workout_sets/.test(phase9Migration), 'source changes reconcile weekly consistency after Phase 7 scoring');
ok(Number.isInteger(phase9Plan) && phase9Plan === 46 && phase9Plan === phase9Count, 'Phase 9 pgTAP plan matches 46 assertions');
ok(/get_my_lifting_consistency_summary/.test(consistencyService), 'consistency service delegates to the guarded Phase 9 summary RPC');
ok(/LIFTING_BADGE_KEYS/.test(consistencyService) && /parseBadges/.test(consistencyService), 'consistency service validates persisted badge keys');
ok(/never add XP/i.test(phase9DashboardScreen), 'dashboard explicitly labels badges as non-XP recognition');
ok(/Recent completed weeks/.test(phase9DashboardScreen) && /currentCompletedWeekStreak/.test(phase9DashboardScreen), 'dashboard surfaces completed-week snapshot and streak state');
ok(/liftingBadgeDefinition/.test(phase9DashboardScreen) && /Earned badges/.test(phase9DashboardScreen), 'dashboard renders badge catalog copy from persisted earned keys');
ok(/event_type === 'LIFTING_WORKOUT'/.test(phase9DashboardService), 'dashboard current lifting days use authoritative scoring events');
ok(/createLiftingConsistencyService/.test(phase9DashboardService), 'dashboard composes the Phase 9 consistency read boundary');
ok(/GOAL_STREAK_8/.test(badgeCatalog) && /CARDIO_BONUS_DAYS_10/.test(badgeCatalog), 'badge catalog includes capped consistency and accessory-cardio milestones');
ok(/consistencySection/.test(phase9DashboardCss) && /badgeGrid/.test(phase9DashboardCss), 'Phase 9 dashboard styling remains colocated in its CSS Module');
ok(!/consistencySection|badgeGrid|recentWeeks/.test(read('src/styles/global.css')), 'Phase 9 selectors are not added to global CSS');
ok(/Phase 9 — Weekly lifting consistency \+ badges — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 9 completion');
ok(/Phase 10 — Group competition\/social — (?:NEXT|DONE)/.test(read('docs/ROADMAP.md')), 'roadmap retains Phase 10 group competition/social after Phase 9');
ok(/badges are derived recognition only/i.test(phase9Doc) && /never write `scoring_events`/i.test(phase9Doc), 'Phase 9 documentation keeps badges outside XP scoring');
ok(versionAtLeast(packageJson.version, '0.8.0') && versionAtLeast(packageLockJson.version, '0.8.0'), 'project metadata is at or beyond v0.8.0');


// Phase 10 — group competition/social
for (const rel of [
  'src/features/social/model.ts',
  'src/features/social/socialService.ts',
  'src/features/social/hooks/useGroupSocial.ts',
  'src/features/social/components/GroupSocialController.tsx',
  'src/features/social/components/GroupSocialScreen.tsx',
  'src/features/social/components/GroupSocialScreen.module.css',
  'supabase/migrations/20260821000100_group_competition_social.sql',
  'supabase/tests/025_group_competition_social.test.sql',
  'docs/PHASE10-GROUP-COMPETITION-SOCIAL.md',
  'tests/e2e/group-social.spec.ts',
  'tests/e2e/socialHarness.tsx',
  'competition.e2e.html',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase10Migration = read('supabase/migrations/20260821000100_group_competition_social.sql');
const phase10Test = read('supabase/tests/025_group_competition_social.test.sql');
const phase10Service = read('src/features/social/socialService.ts');
const phase10Hook = read('src/features/social/hooks/useGroupSocial.ts');
const phase10Screen = read('src/features/social/components/GroupSocialScreen.tsx');
const phase10Css = read('src/features/social/components/GroupSocialScreen.module.css');
const phase10Doc = read('docs/PHASE10-GROUP-COMPETITION-SOCIAL.md');
const phase10ProductController = read('src/features/product/ProductController.tsx');
const phase10Integration = read('tests/integration/group-product-journey.test.tsx');
const phase10Plan = Number((phase10Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase10Count = (phase10Test.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok((phase10Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 10 migration dollar-quote delimiters are balanced');
ok(/create table if not exists public\.group_activity_reactions/.test(phase10Migration), 'Phase 10 persists group-scoped lightweight reactions');
ok(/primary key \(group_id, activity_key, user_id\)/.test(phase10Migration), 'one reaction slot exists per member and activity');
ok(/reaction_type in \('FIRE', 'STRONG', 'CLAP'\)/.test(phase10Migration), 'reaction catalog is deliberately bounded');
ok(/alter table public\.group_activity_reactions enable row level security/.test(phase10Migration), 'reaction table has RLS enabled');
ok(/revoke all on public\.group_activity_reactions from public, anon, authenticated/.test(phase10Migration), 'browser roles cannot directly mutate reaction rows');
ok(/group_social_activity_key/.test(phase10Migration) && /extensions\.digest\(p_identity, 'sha256'\)/.test(phase10Migration), 'social activities use deterministic opaque SHA-256 keys');
ok(/group_social_activity_exists/.test(phase10Migration) && /Social activity is not available in this group/.test(phase10Migration), 'reaction writes validate their current group activity target');
ok(/get_group_competition_leaderboard/.test(phase10Migration), 'Phase 10 adds group competition leaderboard RPC');
ok(/scoring_version = 'lifting-v1'/.test(phase10Migration), 'competition aggregates only authoritative lifting-v1 scoring');
ok(/v_period not in \('WEEK', 'ALL_TIME'\)/.test(phase10Migration), 'competition exposes weekly and all-time periods only');
ok(/dense_rank\(\) over[\s\S]*s\.xp desc[\s\S]*s\.lifting_days desc[\s\S]*pr\.pr_count/.test(phase10Migration), 'competition ranks by XP with deterministic lifting/PR context');
ok(/get_group_social_feed/.test(phase10Migration), 'Phase 10 adds privacy-safe group activity feed RPC');
ok(/'LIFT'::text/.test(phase10Migration) && /'PR'::text/.test(phase10Migration) && /'BADGE'::text/.test(phase10Migration) && /'GOAL'::text/.test(phase10Migration), 'social feed is curated to lift, PR, badge, and weekly-goal activity');
ok(/w\.source = 'IN_APP'[\s\S]*w\.qualifies_lifting/.test(phase10Migration), 'lift feed entries require qualifying in-app lifting sessions');
ok(/p_before_activity_at/.test(phase10Migration) && /p_before_activity_key/.test(phase10Migration), 'social feed uses a stable timestamp-plus-key cursor');
ok(/least\(coalesce\(p_limit, 20\), 50\)/.test(phase10Migration), 'server caps feed pagination at 50 activities');
ok(!/insert into public\.scoring_events|update public\.scoring_events|delete from public\.scoring_events/i.test(phase10Migration), 'social migration never mutates authoritative XP');
ok(/metadata \? 'sets'/.test(phase10Test) && /metadata \? 'notes'/.test(phase10Test), 'database regression proves raw sets and notes are absent from feed metadata');
ok(/metadata \? 'workoutId'/.test(phase10Test) && /metadata \? 'exerciseId'/.test(phase10Test), 'database regression proves source row identifiers stay out of feed metadata');
ok(Number.isInteger(phase10Plan) && phase10Plan === 42 && phase10Plan === phase10Count, 'Phase 10 pgTAP plan matches 42 assertions');
ok(/get_group_competition_leaderboard/.test(phase10Service) && /get_group_social_feed/.test(phase10Service) && /set_group_activity_reaction/.test(phase10Service), 'social service uses all guarded Phase 10 RPCs');
ok(/FEED_PAGE_SIZE\s*\+\s*1/.test(phase10Service) && /nextCursor/.test(phase10Service), 'social service implements page-size-plus-one cursor pagination');
ok(/withOptimisticReaction/.test(phase10Hook) && /setReaction\(groupId,activityKey,nextReaction\)/.test(phase10Hook), 'social hook optimistically applies one reaction and persists it');
ok(/previous/.test(phase10Hook) && /catch\(caught\)/.test(phase10Hook), 'social hook retains rollback state for failed reaction writes');
ok(/Individual sets, workout notes, and full exercise details stay private/.test(phase10Screen), 'Compete UI states its privacy boundary explicitly');
ok(/Reactions never affect XP/.test(phase10Screen), 'Compete UI states reactions are non-XP');
ok(/This week/.test(phase10Screen) && /All time/.test(phase10Screen), 'Compete UI exposes weekly and all-time standings');
ok(/Highlights, not surveillance/.test(phase10Screen), 'social feed is presented as curated highlights rather than surveillance');
ok(!/supabase/i.test(phase10Screen), 'social presentation has no Supabase dependency');
ok(phase10Css.length > 3500, 'Phase 10 social styling is substantial and colocated in a CSS Module');
ok(/id: 'compete', label: 'Compete', icon: 'trophy'/.test(read('src/components/layout/navigation.ts')), 'Compete is a first-class trophy navigation destination');
ok(/grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/.test(read('src/styles/global.css')), 'mobile navigation deliberately accommodates all six product destinations');
ok(/socialService\?: GroupSocialService/.test(phase10ProductController) && /activeSection === 'compete'/.test(phase10ProductController), 'ProductController composes injectable group social navigation');
ok(/GroupSocialController[\s\S]*key=\{selectedGroup\.id\}/.test(phase10ProductController), 'group switching remounts Compete state so previous-group data cannot flash');
ok(/Open competition/.test(read('src/features/groups/components/GroupAdministrationScreen.tsx')), 'group administration links into competition');
ok(/View competition/.test(read('src/features/dashboard/components/DashboardScreen.tsx')), 'dashboard compact rank links into competition');
ok(/GroupSocialService/.test(phase10Integration) && /Crew standings/.test(phase10Integration) && /Highlights, not surveillance/.test(phase10Integration), 'integrated group journeys enter the real Compete surface');
ok(/competition: resolve\(process\.cwd\(\), 'competition\.e2e\.html'\)/.test(read('vite.config.ts')), 'competition fixture is compiled only through the existing E2E build gate');
ok(/scrollWidth - window\.innerWidth/.test(read('tests/e2e/group-social.spec.ts')), 'Phase 10 browser coverage checks responsive horizontal overflow');
ok(/Individual sets, workout notes/.test(read('tests/e2e/group-social.spec.ts')) && /Fire 3/.test(read('tests/e2e/group-social.spec.ts')), 'Phase 10 browser coverage validates privacy copy and reaction interaction');
ok(/no level formula/i.test(phase10Doc) && /leaves levels undefined/i.test(phase10Doc), 'Phase 10 deliberately avoids inventing a level curve');
ok(/never add XP|never affect XP|never add XP/i.test(phase10Doc) || /never add XP/i.test(phase10Doc), 'Phase 10 documentation keeps social mechanics outside XP');
ok(/raw sets/i.test(phase10Doc) && /workout notes/i.test(phase10Doc), 'Phase 10 documentation locks privacy-safe feed summaries');
ok(/Phase 10 — Group competition\/social — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 10 competition/social completion');
ok(/Phase 11 — Cardio accessory logging — (?:NEXT|DONE)/.test(read('docs/ROADMAP.md')), 'roadmap retains Phase 11 cardio accessory logging');
ok(versionAtLeast(packageJson.version, '0.9.0') && versionAtLeast(packageLockJson.version, '0.9.0'), 'project metadata is at or beyond v0.9.0');


// Phase 11 — cardio accessory logging
for (const rel of [
  'src/features/cardio/model.ts',
  'src/features/cardio/cardioService.ts',
  'src/features/cardio/hooks/useCardio.ts',
  'src/features/cardio/components/CardioController.tsx',
  'src/features/cardio/components/CardioScreen.tsx',
  'src/features/cardio/components/CardioScreen.module.css',
  'supabase/migrations/20260821000200_cardio_accessory_logging.sql',
  'supabase/tests/026_cardio_accessory_logging.test.sql',
  'docs/PHASE11-CARDIO-ACCESSORY-LOGGING.md',
  'tests/integration/cardio-accessory-journey.test.tsx',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase11Migration = read('supabase/migrations/20260821000200_cardio_accessory_logging.sql');
const phase11Test = read('supabase/tests/026_cardio_accessory_logging.test.sql');
const phase11Model = read('src/features/cardio/model.ts');
const phase11Service = read('src/features/cardio/cardioService.ts');
const phase11Screen = read('src/features/cardio/components/CardioScreen.tsx');
const phase11Product = read('src/features/product/ProductController.tsx');
const phase11Doc = read('docs/PHASE11-CARDIO-ACCESSORY-LOGGING.md');
const phase11Plan = Number((phase11Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase11Count = (phase11Test.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok((phase11Migration.match(/\$\$/g) || []).length % 2 === 0, 'Phase 11 migration dollar-quote delimiters are balanced');
ok(/log_cardio_activity/.test(phase11Migration) && /delete_cardio_activity/.test(phase11Migration), 'Phase 11 exposes guarded cardio log and correction RPCs');
ok(/get_my_cardio_history/.test(phase11Migration) && /get_my_cardio_summary/.test(phase11Migration), 'Phase 11 exposes guarded cardio history and analytics RPCs');
ok(/'RUNNING','WALKING_HIKING','CYCLING','SWIMMING','SPORT','CARDIO','HIIT'/.test(phase11Migration), 'Phase 11 server supports exactly the locked cardio categories');
ok(/source, started_at, ended_at/.test(phase11Migration) && /'COMPLETED', 'IN_APP'/.test(phase11Migration), 'cardio logger stores completed in-app source sessions');
ok(!/insert into public\.scoring_events|update public\.scoring_events|delete from public\.scoring_events/i.test(phase11Migration), 'Phase 11 does not create a second scoring writer');
ok(!/weekly_lifting_snapshots|lifting_consistency_state/.test(phase11Migration), 'cardio migration never writes weekly lifting consistency state');
ok(/daily_bonus_xp/.test(phase11Migration) && /event_type = 'CARDIO_BONUS'/.test(phase11Migration), 'cardio history identifies authoritative daily bonus ownership');
ok(/least\(greatest\(coalesce\(p_limit,50\),1\),100\)/.test(phase11Migration), 'cardio history read model has a server-side result cap');
ok(Number.isInteger(phase11Plan) && phase11Plan === 34 && phase11Plan === phase11Count, 'Phase 11 pgTAP plan matches 34 assertions');
ok(/CARDIO_BONUS_MIN_ACTIVE_SECONDS/.test(phase11Model) && /cardioDurationTierXp/.test(phase11Model), 'cardio UI derives qualification minimums from the locked domain oracle');
ok(/get_my_cardio_history/.test(phase11Service) && /get_my_cardio_summary/.test(phase11Service) && /log_cardio_activity/.test(phase11Service), 'cardio service uses only guarded Phase 11 RPCs');
ok(/never counts as a lifting day/i.test(phase11Screen), 'cardio screen explicitly preserves lifting-day semantics');
ok(/Only the day’s best eligible cardio bonus is awarded/.test(phase11Screen), 'cardio screen explains best-of-day bonus behavior');
ok(/activeSection === 'cardio'/.test(phase11Product) && /cardioService\?: CardioService/.test(phase11Product), 'ProductController composes injectable accessory cardio navigation');
const phase11Navigation = read('src/components/layout/navigation.ts');
ok(/export type AppSection = [^\n]*'cardio'/.test(phase11Navigation), 'AppSection explicitly includes the Phase 11 cardio route');
ok(!/\{ id: 'cardio', label:/.test(phase11Navigation), 'cardio remains an accessory route rather than a primary navigation item');
ok(/Log cardio/.test(read('src/features/dashboard/components/DashboardScreen.tsx')) && /Log cardio instead/.test(read('src/features/workout/components/WorkoutSessionScreen.tsx')), 'cardio is reachable from home and lifting entry points');
ok(/never counts as a lifting day/i.test(read('tests/integration/cardio-accessory-journey.test.tsx')) && /Delete Cycling/.test(read('tests/integration/cardio-accessory-journey.test.tsx')), 'Phase 11 integration journey covers accessory semantics and correction');
ok(/does not add pace, distance, GPS routes, heart rate/i.test(phase11Doc), 'Phase 11 documentation keeps cardio scope deliberately lightweight');
ok(/Cardio never creates `LIFTING_WORKOUT` events/.test(phase11Doc), 'Phase 11 documentation locks cardio outside lifting-day consistency');
ok(/Phase 11 — Cardio accessory logging — DONE/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 11 cardio accessory logging completion');
ok(/Phase 12 — PWA\/offline hardening — (?:NEXT|IN PROGRESS)/.test(read('docs/ROADMAP.md')), 'roadmap retains Phase 12 PWA/offline hardening');
ok(versionAtLeast(packageJson.version, '0.10.0') && versionAtLeast(packageLockJson.version, '0.10.0'), 'project metadata is at or beyond v0.10.0');


// Phase 12A — IndexedDB workout durability
for (const rel of [
  'src/features/workout/storage/workoutIndexedDb.ts',
  'src/features/workout/recovery/workoutRecoveryStorage.ts',
  'src/features/workout/mutations/workoutMutationStorage.ts',
  'src/features/workout/hooks/useWorkoutRecovery.ts',
  'src/features/workout/hooks/useWorkoutMutationQueue.ts',
  'docs/PHASE12A-INDEXEDDB-WORKOUT-DURABILITY.md',
  'indexeddb.e2e.html',
  'tests/e2e/indexedDbHarness.ts',
  'tests/e2e/indexeddb-durability.spec.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase12IndexedDb = read('src/features/workout/storage/workoutIndexedDb.ts');
const phase12RecoveryStorage = read('src/features/workout/recovery/workoutRecoveryStorage.ts');
const phase12MutationStorage = read('src/features/workout/mutations/workoutMutationStorage.ts');
const phase12RecoveryHook = read('src/features/workout/hooks/useWorkoutRecovery.ts');
const phase12MutationHook = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
const phase12Controller = read('src/features/workout/components/WorkoutController.tsx');
const phase12Doc = read('docs/PHASE12A-INDEXEDDB-WORKOUT-DURABILITY.md');
const phase12Roadmap = read('docs/ROADMAP.md');
const phase12Vite = read('vite.config.ts');
const phase12E2e = read('tests/e2e/indexeddb-durability.spec.ts');
ok(/fitness-game-workout/.test(phase12IndexedDb) && /durable-state/.test(phase12IndexedDb), 'Phase 12A uses one versioned IndexedDB database/object store');
ok(/indexedDB/.test(phase12IndexedDb) && /createObjectStore/.test(phase12IndexedDb), 'Phase 12A opens and upgrades native IndexedDB');
ok(!/supabase/i.test(phase12IndexedDb), 'IndexedDB adapter has no Supabase dependency');
ok(/Promise<ActiveWorkoutRecoverySnapshot \| null>/.test(phase12RecoveryStorage), 'recovery storage is explicitly asynchronous');
ok(/Promise<WorkoutMutationQueueItem\[]>/.test(phase12MutationStorage), 'mutation queue storage is explicitly asynchronous');
ok(/LEGACY_RECOVERY_KEY_PREFIX = 'fitness-game:active-workout:v1:'/.test(phase12RecoveryStorage), 'Phase 12A recognizes the historical recovery key for migration');
ok(/LEGACY_MUTATION_QUEUE_KEY_PREFIX = 'fitness-game:workout-mutations:v1:'/.test(phase12MutationStorage), 'Phase 12A recognizes the historical mutation key for migration');
ok(/await storage\.setItem[\s\S]*legacyStorage\.removeItem/.test(phase12RecoveryStorage), 'recovery legacy key is removed only after durable migration succeeds');
ok(/await storage\.setItem[\s\S]*legacyStorage\.removeItem/.test(phase12MutationStorage), 'mutation legacy key is removed only after durable migration succeeds');
ok(/const \[hydrated, setHydrated\]/.test(phase12RecoveryHook) && /const \[hydrated, setHydrated\]/.test(phase12MutationHook), 'both workout durable-state hooks expose explicit hydration');
ok(/!recovery\.hydrated \|\| !mutationQueue\.hydrated/.test(phase12Controller) && /Recovering saved workout/.test(phase12Controller), 'workout controller gates empty/error decisions until IndexedDB hydration completes');
ok(/await storageRef\.current!\.save\(userId, next\)/.test(phase12MutationHook), 'offline mutation enqueue awaits durable persistence before replay/result');
ok(/Promise<boolean>/.test(phase12MutationStorage), 'mutation storage reports whether a queue write was durably accepted');
ok(/could not save the workout change for safe retry/.test(phase12MutationHook), 'queue refuses network replay when durable persistence fails');
ok(fs.existsSync(path.join(root, 'indexeddb.e2e.html')) && fs.existsSync(path.join(root, 'tests/e2e/indexedDbHarness.ts')), 'native IndexedDB fixture and production-module harness exist');
ok(/indexeddb:\s*resolve\(process\.cwd\(\),\s*['\"]indexeddb\.e2e\.html['\"]\)/.test(phase12Vite), 'native IndexedDB fixture is part of the existing E2E build gate');
ok(/await waitFor\(\(\) => expect\(memory\.read\(\)\?\.ui\.setDrafts/.test(read('src/features/workout/hooks/useWorkoutRecovery.test.tsx')), 'recovery hook test waits for queued durable persistence');
ok(/findByText\(['\"]Barbell Bench Press['\"]\)/.test(read('src/features/workout/components/WorkoutController.test.tsx')), 'controller recovery test waits for asynchronously hydrated exercise content');
ok(/findByLabelText\(['"]Set 1 weight in lb['"]\)/.test(read('src/features/workout/components/WorkoutController.test.tsx')) && /findByLabelText\(['"]Set 1 reps['"]\)/.test(read('src/features/workout/components/WorkoutController.test.tsx')), 'controller recovery test waits for asynchronously hydrated recovered set inputs');
ok(/page\.reload\(\)/.test(phase12E2e) && /Legacy keys: cleared/.test(phase12E2e), 'Phase 12A E2E proves migration and page-reload durability');
ok(/Queue: ADD_SET/.test(phase12E2e), 'Phase 12A E2E proves queued mutation persistence');
const phase12ReliabilityIntegration = read('tests/integration/workout-reliability-journey.test.tsx');
ok(/createWorkoutRecoveryStorage/.test(phase12ReliabilityIntegration) && /createWorkoutMutationStorage/.test(phase12ReliabilityIntegration), 'reliability integration gate inspects durable state through Phase 12A storage adapters');
ok(!/expect\(window\.localStorage\.length\)/.test(phase12ReliabilityIntegration), 'reliability integration gate no longer treats localStorage as the durable workout contract');
ok(/afterEach\(async \(\) =>[\s\S]*createWorkoutRecoveryStorage\(\)\.clear\(USER_ID\)[\s\S]*createWorkoutMutationStorage\(\)\.clear\(USER_ID\)/.test(phase12ReliabilityIntegration), 'reliability integration tests clear durable recovery and queue state between journeys');
const phase12ExerciseHook = read('src/features/workout/hooks/useWorkoutExercises.ts');
const phase12SetHook = read('src/features/workout/hooks/useWorkoutSets.ts');
ok(/resolvedWorkoutId/.test(phase12ExerciseHook) && /resolvedForCurrentWorkout/.test(phase12ExerciseHook) && /effectiveStatus/.test(phase12ExerciseHook), 'exercise hook does not expose stale ready state when the active workout identity changes');
ok(/resolvedExerciseKey/.test(phase12SetHook) && /resolvedForCurrentExercises/.test(phase12SetHook) && /effectiveStatus/.test(phase12SetHook), 'set hook does not expose stale ready state when exercise identities change');
ok(/reports loading immediately when the active workout identity changes/.test(read('src/features/workout/hooks/useWorkoutExercises.test.tsx')), 'exercise hook regression covers the null-to-workout loading boundary');
ok(/reports loading immediately when exercise identities change/.test(read('src/features/workout/hooks/useWorkoutSets.test.tsx')), 'set hook regression covers the empty-to-populated exercise loading boundary');
ok(/snapshot\?\.exercises\.map[\s\S]*WORKOUT_EXERCISE_ID[\s\S]*snapshot\?\.sets\.map[\s\S]*SET_ID/.test(phase12ReliabilityIntegration), 'reliability integration waits for a complete canonical recovery snapshot before simulating offline loss');
ok(/no Supabase migration/i.test(phase12Doc) && /no scoring\/XP changes/i.test(phase12Doc), 'Phase 12A documentation locks database and scoring non-goals');
ok(/12A IndexedDB workout durability — DONE/.test(phase12Roadmap), 'roadmap records Phase 12A completion');
ok(/12B Offline shell \+ install UX — NEXT/.test(phase12Roadmap), 'roadmap advances to Phase 12B');
ok(packageJson.version === '0.11.0' && packageLockJson.version === '0.11.0', 'project metadata records v0.11.0');


// Phase 5.6.1 — targeted user invitations
const targetedInviteMigration = read('supabase/migrations/20260819001100_targeted_group_invitations.sql');
const targetedInviteTest = read('supabase/tests/016_targeted_group_invitations.test.sql');
const targetedInvitePlan = Number((targetedInviteTest.match(/select\s+plan\((\d+)\)/i)||[])[1]);
const targetedInviteCount=(targetedInviteTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi)||[]).length;
ok(/profile_code/.test(targetedInviteMigration),'profiles receive stable invite IDs');
ok(/drop function if exists public\.join_group_by_invite/.test(targetedInviteMigration),'legacy reusable join RPC is retired');
ok(/create_group_invite/.test(targetedInviteMigration)&&/accept_group_invite/.test(targetedInviteMigration)&&/decline_group_invite/.test(targetedInviteMigration),'targeted invite lifecycle RPCs exist');
ok((targetedInviteMigration.match(/delete from public\.group_invites/g)||[]).length >= 4,'accept, decline, revoke, and legacy cleanup remove inactive invite rows');
ok(/Username or invite ID/.test(read('src/features/groups/components/GroupAdministrationScreen.tsx')),'group admin invites one specific user');
ok(/pending invitations/i.test(read('src/features/groups/components/GroupSetupScreen.tsx')),'zero-group setup exposes recipient inbox');
ok(/Your invite ID/.test(read('src/features/groups/components/GroupSetupScreen.tsx')) && /Your invite ID/.test(read('src/features/groups/components/GroupAdministrationScreen.tsx')),'stable profile invite ID is visible before and after joining a group');
ok(/is null or v_role not in/.test(targetedInviteMigration),'targeted invite admin checks reject null/outsider roles');
ok(!/Copy code/.test(read('src/features/groups/components/GroupAdministrationScreen.tsx')),'group UI does not expose reusable copy-code actions');
ok(Number.isInteger(targetedInvitePlan) && targetedInvitePlan===targetedInviteCount && targetedInvitePlan>=29,'targeted invitation pgTAP plan covers the full recipient lifecycle');


// Phase 9 integration fixture must carry the complete dashboard consistency contract.
const phase9GroupProductIntegration = read('tests/integration/group-product-journey.test.tsx');
ok(
  /consistency:\s*\{[\s\S]*currentCompletedWeekStreak[\s\S]*bestCompletedWeekStreak[\s\S]*badges:\s*\[\]/.test(phase9GroupProductIntegration),
  'Phase 9 group-product integration fixture includes the required consistency snapshot',
);
ok(
  (phase9GroupProductIntegration.match(/Completed weeks & badges/g) || []).length >= 2,
  'Phase 9 integrated owner and member journeys render weekly consistency content',
);

console.log(`Project structural validation passed: ${assertions} assertions.`);
