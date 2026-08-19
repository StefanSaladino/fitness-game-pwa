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
  'src/features/groups/model.ts','src/features/groups/validation.ts','src/features/groups/groupMessages.ts','src/features/groups/groupService.ts','src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts','src/features/groups/components/CreateGroupForm.tsx','src/features/groups/components/JoinGroupForm.tsx','src/features/groups/components/GroupSetupScreen.tsx','src/features/groups/components/GroupSetupController.tsx','src/features/groups/components/GroupGate.tsx','src/features/groups/components/GroupSetup.module.css','src/features/groups/components/GroupGate.module.css',
  'src/features/profile-picture/model.ts','src/features/profile-picture/validation.ts','src/features/profile-picture/profilePictureMessages.ts','src/features/profile-picture/profilePictureService.ts','src/features/profile-picture/hooks/useProfilePicture.ts','src/features/profile-picture/components/ProfilePicture.tsx','src/features/profile-picture/components/ProfilePictureManager.tsx','src/features/profile-picture/components/ProfilePicture.module.css','src/features/profile-picture/components/ProfilePictureManager.module.css',
  'src/features/dashboard/model.ts','src/features/dashboard/dashboardMath.ts','src/features/dashboard/dashboardMessages.ts','src/features/dashboard/dashboardService.ts','src/features/dashboard/hooks/useDashboard.ts','src/features/dashboard/components/DashboardController.tsx','src/features/dashboard/components/DashboardScreen.tsx','src/features/dashboard/components/DashboardScreen.module.css','docs/PHASE5.5D-LIFTING-DASHBOARD.md',
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

for (const rel of ['supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql','supabase/tests/008_profile_pictures.test.sql','supabase/tests/009_dashboard_read_models.test.sql','supabase/tests/010_group_administration_permissions.test.sql']) {
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
ok(/useCreateGroup/.test(groupSetupController) && /useJoinGroup/.test(groupSetupController), 'GroupSetupController uses focused create/join hooks');
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
ok(/qualifies_lifting/.test(dashboardService), 'dashboard weekly progress reads explicit lifting qualification');
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
ok(/listInvites/.test(groupAdministrationHook) && /group\.role === 'OWNER' \|\| group\.role === 'ADMIN'/.test(groupAdministrationHook), 'invite administration is only loaded for owner/admin roles');
ok(/setMemberRole/.test(groupAdministrationHook) && /transferOwnership/.test(groupAdministrationHook), 'group administration hook delegates role/ownership mutations to the service');
ok(/activeSection/.test(productController) && /selectedGroupId/.test(productController), 'ProductController owns section and selected-group navigation state');
ok(/DashboardController/.test(productController) && /GroupAdministrationController/.test(productController), 'ProductController composes dashboard and group administration views');
ok(groupAdministrationCss.length > 1500, 'group administration styling is substantial and colocated in a CSS Module');
ok(!/memberRow|inviteRow|renameForm|groupAdministration/.test(read('src/styles/global.css')), 'Phase 5.6 selectors are not added to global CSS');
ok(/Group administration UI — DONE/.test(read('docs/ROADMAP.md')), 'roadmap marks Phase 5.6 group administration complete');

console.log(`Project structural validation passed: ${assertions} assertions.`);
