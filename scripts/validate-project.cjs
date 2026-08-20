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
ok(/Workout reliability — IN PROGRESS/.test(read('docs/ROADMAP.md')), 'roadmap records Phase 6.4 reliability in progress');
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
ok(/6\.4D Reliability integration gate — NEXT/.test(read('docs/ROADMAP.md')), 'roadmap advances to Phase 6.4D reliability integration');
ok(/"version": "0\.5\.3"/.test(read('package.json')) && /"version": "0\.5\.3"/.test(read('package-lock.json')), 'project metadata records the v0.5.3 checkpoint');


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

console.log(`Project structural validation passed: ${assertions} assertions.`);
