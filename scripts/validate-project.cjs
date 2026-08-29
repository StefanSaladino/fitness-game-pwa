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

const required = ['.gitignore','.env.example',
  'supabase/migrations/20260818000100_initial_data_foundation.sql','supabase/migrations/20260818000200_phase5_onboarding_foundation.sql','supabase/migrations/20260819000100_lifting_first_scoring_foundation.sql','supabase/migrations/20260819000200_profile_pictures.sql','supabase/migrations/20260819000300_dashboard_read_models.sql','supabase/seed.sql',
  'supabase/tests/001_schema.test.sql','supabase/tests/002_rls.test.sql','supabase/tests/003_groups.test.sql','supabase/tests/004_qualification.test.sql','supabase/tests/005_profile_onboarding.test.sql','supabase/tests/006_phase5_onboarding_username.test.sql','supabase/tests/007_lifting_scoring_foundation.test.sql','supabase/tests/008_profile_pictures.test.sql','supabase/tests/009_dashboard_read_models.test.sql','supabase/tests/010_group_administration_permissions.test.sql',
  'src/domain/scoring/exerciseXp.ts','src/domain/scoring/cardioBonus.ts','src/domain/scoring/dailyXp.ts',
  'src/features/auth/authService.ts','src/features/auth/authValidation.ts','src/features/auth/authMessages.ts','src/features/auth/hooks/useAuthActions.ts',
  'src/features/onboarding/model.ts','src/features/onboarding/validation.ts','src/features/onboarding/state.ts','src/features/onboarding/onboardingService.ts','src/features/onboarding/timezones.ts','src/features/onboarding/onboardingMessages.ts','src/features/onboarding/hooks/useOnboarding.ts',
  'src/features/groups/model.ts','src/features/groups/validation.ts','src/features/groups/groupMessages.ts','src/features/groups/groupService.ts','src/features/groups/hooks/useGroups.ts','src/features/groups/hooks/useCreateGroup.ts','src/features/groups/hooks/useJoinGroup.ts','src/features/groups/hooks/usePendingGroupInvites.ts',
  'src/features/profile-picture/model.ts','src/features/profile-picture/validation.ts','src/features/profile-picture/profilePictureMessages.ts','src/features/profile-picture/profilePictureService.ts','src/features/profile-picture/hooks/useProfilePicture.ts',
  'src/features/dashboard/model.ts','src/features/dashboard/dashboardMath.ts','src/features/dashboard/dashboardMessages.ts','src/features/dashboard/dashboardService.ts','src/features/dashboard/hooks/useDashboard.ts',];
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
const authActions = read('src/features/auth/hooks/useAuthActions.ts');
ok(/authService/.test(authActions), 'auth controller hook owns the auth service dependency');
const onboardingHook = read('src/features/onboarding/hooks/useOnboarding.ts');
ok(/onboardingService/.test(onboardingHook), 'onboarding controller hook owns the onboarding service dependency');
ok(/getProfile\(userId\)/.test(onboardingHook), 'onboarding hook reloads persisted profile state');

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

const env = read('.env.example');
const envAssignments = env.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).join('\n');
ok(!/service[_-]?role|secret[_-]?key|database_url|postgres_password/i.test(envAssignments), '.env.example contains no privileged secret assignments');
ok(!/sb_secret_/i.test(envAssignments), '.env.example contains no Supabase secret key value');
ok(env.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'browser-safe Supabase key variable documented');
const gitignore = read('.gitignore');
for (const pattern of ['.env', '.env.*', '!.env.example', '*.pem', '*.key', 'supabase/.env']) {
  ok(gitignore.includes(pattern), `.gitignore protects ${pattern}`);
}


const profilePictureService = read('src/features/profile-picture/profilePictureService.ts');
ok(/PROFILE_PICTURE_BUCKET = 'profile-pictures'/.test(profilePictureService), 'profile-picture service targets the dedicated bucket');
ok(/upsert: false/.test(profilePictureService), 'profile-picture replacement avoids storage upsert');
ok(/profile_picture_path/.test(profilePictureService), 'profile-picture service persists only the profile path reference');
ok(/profilePicturePath/.test(read('src/features/groups/model.ts')), 'group member identity carries profile-picture path');



const dashboardMigration = read('supabase/migrations/20260819000300_dashboard_read_models.sql');
const dashboardService = read('src/features/dashboard/dashboardService.ts');
const dashboardHook = read('src/features/dashboard/hooks/useDashboard.ts');
ok(/get_group_lifting_leaderboard/.test(dashboardMigration), 'dashboard migration adds group leaderboard RPC');
ok(/is_active_group_member\(p_group_id\)/.test(dashboardMigration), 'leaderboard RPC requires active group membership');
ok(/scoring_version = 'lifting-v1'/.test(dashboardMigration), 'leaderboard aggregates only lifting-v1 scoring events');
ok(/revoke all on function public\.get_group_lifting_leaderboard/.test(dashboardMigration), 'leaderboard RPC revokes public execution');
ok(/event_type === 'LIFTING_WORKOUT'/.test(dashboardService), 'dashboard weekly progress reads authoritative lifting-v1 scoring dates');
ok(/exercise_progress/.test(dashboardService), 'dashboard reads exercise progress snapshots for PRs');
ok(/get_group_lifting_leaderboard/.test(dashboardService), 'dashboard service uses the guarded leaderboard RPC');
ok(/createDashboardService/.test(dashboardHook), 'dashboard hook owns the dashboard service dependency');



const leaderboardPermissionHotfix = read('supabase/migrations/20260819000400_lock_down_dashboard_leaderboard.sql');
ok(/from anon/.test(leaderboardPermissionHotfix), 'dashboard leaderboard hotfix explicitly revokes anon execution');
ok(/to authenticated/.test(leaderboardPermissionHotfix), 'dashboard leaderboard hotfix grants authenticated execution');

const groupAdminPermissionMigration = read('supabase/migrations/20260819000500_group_administration_permissions.sql');
for (const fn of ['join_group_by_invite','remove_group_member','set_group_member_role','transfer_group_ownership','leave_group']) {
  ok(groupAdminPermissionMigration.includes(`public.${fn}`), `Phase 5.6 permission migration covers ${fn}`);
}
ok((groupAdminPermissionMigration.match(/from anon/g) || []).length === 5, 'Phase 5.6 explicitly revokes anon execution from every group mutation RPC');
ok((groupAdminPermissionMigration.match(/to authenticated/g) || []).length === 5, 'Phase 5.6 grants every group mutation RPC only to authenticated clients');
const groupAdministrationHook = read('src/features/groups/hooks/useGroupAdministration.ts');
ok(/listInvites/.test(groupAdministrationHook) && /canManage=group\.role==='OWNER'\|\|group\.role==='ADMIN'/.test(groupAdministrationHook), 'outgoing invite administration is only loaded for owner/admin roles');
ok(/setMemberRole/.test(groupAdministrationHook) && /transferOwnership/.test(groupAdministrationHook), 'group administration hook delegates role/ownership mutations to the service');
const integrationVitestConfig = read('vitest.integration.config.ts');
const packageJsonPhase57 = read('package.json');
ok(/tests\/integration\/\*\*\/\*\.test/.test(integrationVitestConfig), 'integration Vitest config explicitly discovers tests/integration');
ok(/vitest run --config vitest\.integration\.config\.ts/.test(packageJsonPhase57), 'test:integration uses the dedicated integration Vitest config');



const workoutLifecycleMigration = read('supabase/migrations/20260819000600_workout_session_lifecycle.sql');
const workoutService = read('src/features/workout/workoutService.ts');
const workoutHook = read('src/features/workout/hooks/useActiveWorkout.ts');
ok(/workout_sessions_one_active_in_app_lift/.test(workoutLifecycleMigration), 'Phase 6.1 enforces one active in-app lifting session per user');
ok(/start_or_resume_lifting_workout/.test(workoutLifecycleMigration), 'Phase 6.1 adds idempotent start/resume RPC');
ok(/pause_lifting_workout/.test(workoutLifecycleMigration) && /resume_lifting_workout/.test(workoutLifecycleMigration), 'Phase 6.1 persists pause/resume through RPCs');
ok(/revoke insert, update, delete on public\.workout_sessions from authenticated/.test(workoutLifecycleMigration), 'Phase 6.1 blocks direct authenticated session mutation');
ok((workoutLifecycleMigration.match(/from public, anon, authenticated/g) || []).length === 5, 'Phase 6.1 lifecycle RPCs revoke default/public execution');
ok((workoutLifecycleMigration.match(/grant execute on function public\.[^(]+\([^)]*\) to authenticated/g) || []).length === 5, 'Phase 6.1 lifecycle RPCs grant authenticated execution');
ok(/loadActiveWorkout/.test(workoutService) && /status', 'IN_PROGRESS'/.test(workoutService), 'workout service recovers only active sessions');
ok(/start_or_resume_lifting_workout/.test(workoutService) && /finish_lifting_workout/.test(workoutService), 'workout service delegates lifecycle writes to authoritative RPCs');



const workoutCompositionMigration = read('supabase/migrations/20260819000800_workout_exercise_composition.sql');
const workoutCompositionService = read('src/features/workout/workoutExerciseService.ts');
const workoutCompositionHook = read('src/features/workout/hooks/useWorkoutExercises.ts');
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



const exercisePickerMigration = read('supabase/migrations/20260819000900_exercise_picker_catalog.sql');
const exercisePickerService = read('src/features/workout/exercisePickerService.ts');
const exerciseSearch = read('src/features/workout/exerciseSearch.ts');
const exercisePickerHook = read('src/features/workout/hooks/useExercisePickerCatalog.ts');
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
const phase61c1Migration = read('supabase/migrations/20260819001000_oblique_muscle_group.sql');
const phase61c1SqlTest = read('supabase/tests/015_muscle_group_icon_taxonomy.test.sql');
const timerIntentMigration = read('supabase/migrations/20260819001200_workout_timer_intent_sync.sql');
const timerIntentTest = read('supabase/tests/017_workout_timer_intent_sync.test.sql');
const workoutServicePhase61c2 = read('src/features/workout/workoutService.ts');
const phase61c1IconDir = path.join(root, 'src/assets/muscle-groups');
const phase61c1Icons = fs.readdirSync(phase61c1IconDir).filter((name) => name.endsWith('.png'));
const phase61c1Plan = Number((phase61c1SqlTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase61c1Count = (phase61c1SqlTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
const timerIntentPlan = Number((timerIntentTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const timerIntentCount = (timerIntentTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi) || []).length;
ok(phase61c1Icons.length === 14, 'muscle selector ships 14 individual transparent PNG assets');
ok(/'OBLIQUES'/.test(phase61c1Migration) && /primary_muscle_group = 'OBLIQUES'/.test(phase61c1Migration), 'Phase 6.1C.1 adds real oblique taxonomy');
ok(Number.isInteger(phase61c1Plan) && phase61c1Plan === 6 && phase61c1Plan === phase61c1Count, 'Phase 6.1C.1 pgTAP plan matches 6 assertions');
ok(/start_or_resume_lifting_workout_intent/.test(timerIntentMigration) && /pause_lifting_workout_intent/.test(timerIntentMigration) && /resume_lifting_workout_intent/.test(timerIntentMigration), 'timer intent migration adds latency-aware lifecycle RPCs');
ok(/interval '15 seconds'/.test(timerIntentMigration) && /interval '2 seconds'/.test(timerIntentMigration), 'timer intent timestamps are accepted only inside a narrow server-time window');
ok(/start_or_resume_lifting_workout_intent/.test(workoutServicePhase61c2) && /pause_lifting_workout_intent/.test(workoutServicePhase61c2), 'workout service uses intent-aware lifecycle RPCs');
ok(!/loadById/.test(workoutServicePhase61c2), 'start/pause/resume no longer require a second session-select round trip');
ok(Number.isInteger(timerIntentPlan) && timerIntentPlan === 16 && timerIntentPlan === timerIntentCount, 'timer intent pgTAP plan matches 16 assertions');



// Phase 6.3 â€” per-set workout logging
const setTrackingMigration = read('supabase/migrations/20260819001300_workout_set_tracking.sql');
const setTrackingTest = read('supabase/tests/018_workout_set_tracking.test.sql');
const workoutSetService = read('src/features/workout/workoutSetService.ts');
const workoutSetHook = read('src/features/workout/hooks/useWorkoutSets.ts');
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
ok(/displayWeightToKg/.test(weightUnits) && /kgToDisplayWeight/.test(weightUnits), 'weight display conversion preserves canonical kilograms');
ok(Number.isInteger(phase63Plan) && phase63Plan === 34 && phase63Plan === phase63Count, 'Phase 6.3 pgTAP plan matches 34 assertions');


// Phase 6.4A â€” local active-workout recovery
for (const rel of [
  'src/features/workout/recovery/workoutRecoveryModel.ts',
  'src/features/workout/recovery/workoutRecoveryStorage.ts',
  'src/features/workout/hooks/useWorkoutRecovery.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const recoveryModel = read('src/features/workout/recovery/workoutRecoveryModel.ts');
const recoveryStorage = read('src/features/workout/recovery/workoutRecoveryStorage.ts');
const recoveryHook = read('src/features/workout/hooks/useWorkoutRecovery.ts');
ok(/WORKOUT_RECOVERY_VERSION = 1/.test(recoveryModel), 'Phase 6.4A versions the local recovery contract');
ok(/WorkoutRecoverySessionSnapshot/.test(recoveryModel) && /WorkoutRecoveryExerciseSnapshot/.test(recoveryModel) && /WorkoutRecoverySetSnapshot/.test(recoveryModel), 'recovery snapshot uses explicit local contracts instead of database row shapes');
ok(!/supabase/i.test(recoveryModel), 'pure recovery model has no Supabase dependency');
ok(/fitness-game:active-workout:v1:/.test(recoveryStorage), 'recovery storage is versioned and namespaced');
ok(/parseWorkoutRecoverySnapshot/.test(recoveryStorage) && /removeItem/.test(recoveryStorage), 'invalid local recovery snapshots are discarded');
ok(!/supabase/i.test(recoveryStorage), 'local recovery storage has no Supabase dependency');
ok(/addEventListener\('online'/.test(recoveryHook) && /addEventListener\('offline'/.test(recoveryHook), 'recovery hook owns browser connectivity state');
ok(/reconnectCount/.test(recoveryHook) && /captureCanonical/.test(recoveryHook), 'recovery hook exposes one-shot reconnect and canonical capture orchestration');


// Phase 6.4B â€” idempotent workout mutation queue
for (const rel of [
  'src/features/workout/mutations/workoutMutationModel.ts',
  'src/features/workout/mutations/workoutMutationStorage.ts',
  'src/features/workout/mutations/workoutMutationService.ts',
  'src/features/workout/mutations/workoutMutationReplay.ts',
  'src/features/workout/hooks/useWorkoutMutationQueue.ts',
  'supabase/migrations/20260820000100_idempotent_workout_mutations.sql',
  'supabase/tests/019_idempotent_workout_mutations.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const mutationModel = read('src/features/workout/mutations/workoutMutationModel.ts');
const mutationStorage = read('src/features/workout/mutations/workoutMutationStorage.ts');
const mutationService = read('src/features/workout/mutations/workoutMutationService.ts');
const mutationReplay = read('src/features/workout/mutations/workoutMutationReplay.ts');
const mutationHook = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
const mutationMigration = read('supabase/migrations/20260820000100_idempotent_workout_mutations.sql');
const mutationTest = read('supabase/tests/019_idempotent_workout_mutations.test.sql');
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
ok(/mutationExecutor\?/.test(workoutSetHook) && /mutationExecutor\?/.test(read('src/features/workout/hooks/useWorkoutExercises.ts')), 'exercise and set hooks support the queue orchestration boundary');
ok(/create table if not exists public\.workout_mutation_receipts/.test(mutationMigration), 'database stores durable per-user mutation receipts');
ok(/primary key \(user_id, idempotency_key\)/.test(mutationMigration), 'idempotency uniqueness is scoped per user');
ok(/request_payload <> v_payload/.test(mutationMigration), 'same idempotency key cannot be reused with a different request');
ok(/apply_lifting_workout_mutation/.test(mutationMigration) && /grant execute on function public\.apply_lifting_workout_mutation/.test(mutationMigration), 'authenticated clients receive the idempotent mutation gateway');
ok(/add_lifting_workout_set/.test(mutationMigration) && /copy_lifting_workout_set/.test(mutationMigration) && /save_lifting_workout_set/.test(mutationMigration), 'idempotent gateway delegates set writes to guarded authoritative functions');
ok(Number.isInteger(phase64bPlan) && phase64bPlan === 26 && phase64bPlan === phase64bCount, 'Phase 6.4B pgTAP plan matches 26 assertions');


// Phase 6.4C â€” conflict and destructive-edit safety
for (const rel of [
  'supabase/migrations/20260820000200_workout_conflict_safety.sql',
  'supabase/tests/020_workout_conflict_safety.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const conflictMigration = read('supabase/migrations/20260820000200_workout_conflict_safety.sql');
const conflictTest = read('supabase/tests/020_workout_conflict_safety.test.sql');
const conflictExerciseService = read('src/features/workout/workoutExerciseService.ts');
const conflictSetService = read('src/features/workout/workoutSetService.ts');
const conflictActiveHook = read('src/features/workout/hooks/useActiveWorkout.ts');
const phase64cPlan = Number((conflictTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase64cCount = (conflictTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/revision: number/.test(read('src/features/workout/model.ts')), 'workout exercise/set view models expose revision tokens');
ok(/revision/.test(conflictExerciseService) && /revision/.test(conflictSetService), 'authoritative exercise and set reads include server revisions');
ok(/expectedRevision/.test(mutationModel) && /WorkoutMutationErrorKind = 'retryable' \| 'conflict' \| 'terminal'/.test(mutationModel), 'queued destructive writes carry optimistic-concurrency revisions and explicit conflict state');
ok(/WORKOUT_CONFLICT:/.test(mutationModel) && /WorkoutMutationQueueItemStatus = 'pending' \| 'failed' \| 'conflict'/.test(mutationModel), 'client model recognizes server conflict responses');
ok(/discardConflictingWorkout/.test(mutationHook), 'queue requires an explicit discard action for a conflicting workout');
ok(/revisionCursor/.test(workoutSetHook), 'set hook advances revision expectations synchronously across rapid queued saves');
ok(/await load\(\)/.test(conflictActiveHook) && /finish/.test(conflictActiveHook) && /cancel/.test(conflictActiveHook), 'finish/cancel failures re-check authoritative active-workout state');
ok(/add column if not exists revision bigint not null default 0/.test(conflictMigration), 'database adds revision counters to workout capture rows');
ok(/bump_workout_row_revision/.test(conflictMigration), 'database increments row revisions on updates');
ok(/for update/.test(conflictMigration) && /v_current_revision <> v_expected_revision/.test(conflictMigration), 'conflict gateway locks rows before comparing expected revisions');
ok(/Workout is no longer active on the server/.test(conflictMigration), 'completed and cancelled workouts reject queued capture mutations as conflicts');
ok(Number.isInteger(phase64cPlan) && phase64cPlan === 31 && phase64cPlan === phase64cCount, 'Phase 6.4C pgTAP plan matches 31 assertions');


// Phase 6.4D â€” reliability integration gate
for (const rel of [
  'reliability.e2e.html',
  'supabase/tests/021_workout_reliability_gate.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const reliabilityDbTest = read('supabase/tests/021_workout_reliability_gate.test.sql');
const reliabilityVite = read('vite.config.ts');
const reliabilityPlaywright = read('playwright.config.ts');
const phase64dPlan = Number((reliabilityDbTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase64dCount = (reliabilityDbTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/FITNESS_E2E_RELIABILITY/.test(reliabilityVite) && /FITNESS_E2E_RELIABILITY/.test(reliabilityPlaywright), 'browser reliability fixture is included only for the E2E build');
ok(Number.isInteger(phase64dPlan) && phase64dPlan === 17 && phase64dPlan === phase64dCount, 'Phase 6.4D pgTAP plan matches 17 assertions');


// Phase 7 â€” authoritative lifting-v1 scoring persistence
for (const rel of [
  'supabase/migrations/20260820000300_authoritative_lifting_scoring.sql',
  'supabase/tests/022_authoritative_lifting_scoring.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase7Migration = read('supabase/migrations/20260820000300_authoritative_lifting_scoring.sql');
const phase7Test = read('supabase/tests/022_authoritative_lifting_scoring.test.sql');
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
ok(/best_weight_kg/.test(phase7Migration) && /best_reps/.test(phase7Migration), 'personal-best snapshots retain source weight and reps');
ok(Number.isInteger(phase7Plan) && phase7Plan === 32 && phase7Plan === phase7Count, 'Phase 7 pgTAP plan matches 32 assertions');


// Phase 8 â€” exercise progression engine + history
for (const rel of [
  'src/features/progress/model.ts',
  'src/features/progress/progressService.ts',
  'src/features/progress/hooks/useExerciseProgress.ts',
  'supabase/migrations/20260820000400_exercise_progress_history.sql',
  'supabase/tests/023_exercise_progress_history.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const progressHistoryMigration = read('supabase/migrations/20260820000400_exercise_progress_history.sql');
const progressHistoryTest = read('supabase/tests/023_exercise_progress_history.test.sql');
const progressHistoryService = read('src/features/progress/progressService.ts');
const progressHistoryHook = read('src/features/progress/hooks/useExerciseProgress.ts');
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


// Phase 9 â€” weekly lifting consistency + badges
for (const rel of [
  'src/features/consistency/model.ts',
  'src/features/consistency/badges.ts',
  'src/features/consistency/consistencyService.ts',
  'supabase/migrations/20260820000500_weekly_consistency_badges.sql',
  'supabase/tests/024_weekly_consistency_badges.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase9Migration = read('supabase/migrations/20260820000500_weekly_consistency_badges.sql');
const phase9Test = read('supabase/tests/024_weekly_consistency_badges.test.sql');
const consistencyService = read('src/features/consistency/consistencyService.ts');
const badgeCatalog = read('src/features/consistency/badges.ts');
const phase9DashboardService = read('src/features/dashboard/dashboardService.ts');
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
ok(/event_type === 'LIFTING_WORKOUT'/.test(phase9DashboardService), 'dashboard current lifting days use authoritative scoring events');
ok(/createLiftingConsistencyService/.test(phase9DashboardService), 'dashboard composes the Phase 9 consistency read boundary');
ok(/GOAL_STREAK_8/.test(badgeCatalog) && /CARDIO_BONUS_DAYS_10/.test(badgeCatalog), 'badge catalog includes capped consistency and accessory-cardio milestones');


// Phase 10 â€” group competition/social
for (const rel of [
  'src/features/social/model.ts',
  'src/features/social/socialService.ts',
  'src/features/social/hooks/useGroupSocial.ts',
  'supabase/migrations/20260821000100_group_competition_social.sql',
  'supabase/tests/025_group_competition_social.test.sql',
  'competition.e2e.html',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase10Migration = read('supabase/migrations/20260821000100_group_competition_social.sql');
const phase10Test = read('supabase/tests/025_group_competition_social.test.sql');
const phase10Service = read('src/features/social/socialService.ts');
const phase10Hook = read('src/features/social/hooks/useGroupSocial.ts');
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
ok(/v_period not in \('WEEK', 'ALL_TIME'\)/.test(phase10Migration), 'historical Phase 10 migration records the superseded period-overloaded competition contract');
ok(/dense_rank\(\) over[\s\S]*s\.xp desc[\s\S]*s\.lifting_days desc[\s\S]*pr\.pr_count/.test(phase10Migration), 'competition ranks by XP with deterministic lifting/PR context');
ok(/get_group_social_feed/.test(phase10Migration), 'Phase 10 adds privacy-safe group activity feed RPC');
ok(/'LIFT'::text/.test(phase10Migration) && /'PR'::text/.test(phase10Migration) && /'BADGE'::text/.test(phase10Migration) && /'GOAL'::text/.test(phase10Migration), 'social feed is curated to lift, PR, badge, and weekly-goal activity');
ok(/w\.source = 'IN_APP'[\s\S]*w\.qualifies_lifting/.test(phase10Migration), 'lift feed entries require qualifying in-app lifting sessions');
ok(/p_before_activity_at/.test(phase10Migration) && /p_before_activity_key/.test(phase10Migration), 'social feed uses a stable timestamp-plus-key cursor');
ok(/least\(coalesce\(p_limit, 20\), 50\)/.test(phase10Migration), 'server caps feed pagination at 50 activities');
ok(!/insert into public\.scoring_events|update public\.scoring_events|delete from public\.scoring_events/i.test(phase10Migration), 'social migration never mutates authoritative XP');
ok(/metadata \? 'sets'/.test(phase10Test) && /metadata \? 'notes'/.test(phase10Test), 'database regression proves raw sets and notes are absent from feed metadata');
ok(/metadata \? 'workoutId'/.test(phase10Test) && /metadata \? 'exerciseId'/.test(phase10Test), 'database regression proves source row identifiers stay out of feed metadata');
ok(Number.isInteger(phase10Plan) && phase10Plan === 38 && phase10Plan === phase10Count, 'Phase 10 pgTAP plan matches 38 retained group-social assertions after 17.2C removes group all-time coverage');
ok(/loadGroupLeaderboard/.test(phase10Service) && /get_group_competition_leaderboard/.test(phase10Service) && /get_group_social_feed/.test(phase10Service) && /set_group_activity_reaction/.test(phase10Service), 'social service uses the weekly group leaderboard plus guarded Phase 10 social RPCs');
ok(/FEED_PAGE_SIZE\s*\+\s*1/.test(phase10Service) && /nextCursor/.test(phase10Service), 'social service implements page-size-plus-one cursor pagination');
ok(/withOptimisticReaction/.test(phase10Hook) && /setReaction\(groupId,activityKey,nextReaction\)/.test(phase10Hook), 'social hook optimistically applies one reaction and persists it');
ok(/previous/.test(phase10Hook) && /catch\(caught\)/.test(phase10Hook), 'social hook retains rollback state for failed reaction writes');
ok(/competition: resolve\(process\.cwd\(\), 'competition\.e2e\.html'\)/.test(read('vite.config.ts')), 'competition fixture is compiled only through the existing E2E build gate');


// Phase 17.2C — global all-time leaderboard
for (const rel of [
  'supabase/migrations/20260829030000_phase17_2c_global_all_time_leaderboard.sql',
  'supabase/tests/043_phase17_2c_global_all_time_leaderboard.test.sql',
  'src/features/social/components/CompetitionController.tsx',
  'src/features/social/components/GlobalAllTimeLeaderboardScreen.tsx',
  'src/features/social/hooks/useGlobalAllTimeLeaderboard.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase172cMigration = read('supabase/migrations/20260829030000_phase17_2c_global_all_time_leaderboard.sql');
const phase172cTest = read('supabase/tests/043_phase17_2c_global_all_time_leaderboard.test.sql');
const phase172cGroupScreen = read('src/features/social/components/GroupSocialScreen.tsx');
const phase172cGlobalScreen = read('src/features/social/components/GlobalAllTimeLeaderboardScreen.tsx');
const phase172cPlan = Number((phase172cTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase172cCount = (phase172cTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is|cmp_ok|ok)\s*\(/gi) || []).length;
ok(/drop function if exists public\.get_group_competition_leaderboard\(uuid, text, date\)/.test(phase172cMigration), '17.2C retires the period-overloaded group leaderboard signature');
ok(/get_group_competition_leaderboard\(\s*p_group_id uuid\s*\)/.test(phase172cMigration), '17.2C group competition contract is weekly-only and accepts only a group id');
ok(/get_global_all_time_leaderboard\(\)/.test(phase172cMigration), '17.2C exposes a dedicated no-argument global all-time RPC');
ok(/row_number\(\) over/.test(phase172cMigration) && /global_rank <= 10/.test(phase172cMigration), 'global leaderboard produces an exact deterministic Top 10');
ok(/'CURRENT_USER'::text/.test(phase172cMigration) && /where r\.member_user_id = v_user_id/.test(phase172cMigration), 'global response always includes a detached current-user row');
ok(/onboarding_completed_at is not null/.test(phase172cMigration) && /pas\.status = 'ACTIVE'::public\.platform_account_status/.test(phase172cMigration), 'global eligibility is limited to active onboarded accounts');
ok(!/ALL_TIME/.test(phase172cGroupScreen) && !/All time/.test(phase172cGroupScreen), 'group competition UI no longer exposes an all-time period');
ok(/Global all-time/.test(phase172cGlobalScreen) && /Your global rank/.test(phase172cGlobalScreen), 'global UI exposes Top 10 and detached current-user rank surfaces');
ok(!/GroupSocialFeedItem|GroupReactionType|UserReportDialog|onReact/.test(phase172cGlobalScreen), 'global all-time screen has no feed, reaction, or reporting social surface');
ok(/get_global_all_time_leaderboard/.test(phase10Service) && !/p_period/.test(phase10Service), 'social service uses the dedicated global RPC and sends no period to group competition');
ok(Number.isInteger(phase172cPlan) && phase172cPlan === 15 && phase172cPlan === phase172cCount, 'Phase 17.2C pgTAP plan matches 15 assertions');


// Phase 11 â€” cardio accessory logging
for (const rel of [
  'src/features/cardio/model.ts',
  'src/features/cardio/cardioService.ts',
  'src/features/cardio/hooks/useCardio.ts',
  'supabase/migrations/20260821000200_cardio_accessory_logging.sql',
  'supabase/tests/026_cardio_accessory_logging.test.sql',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase11Migration = read('supabase/migrations/20260821000200_cardio_accessory_logging.sql');
const phase11Test = read('supabase/tests/026_cardio_accessory_logging.test.sql');
const phase11Model = read('src/features/cardio/model.ts');
const phase11Service = read('src/features/cardio/cardioService.ts');
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


// Phase 12A â€” IndexedDB workout durability
for (const rel of [
  'src/features/workout/storage/workoutIndexedDb.ts',
  'src/features/workout/recovery/workoutRecoveryStorage.ts',
  'src/features/workout/mutations/workoutMutationStorage.ts',
  'src/features/workout/hooks/useWorkoutRecovery.ts',
  'src/features/workout/hooks/useWorkoutMutationQueue.ts',
  'indexeddb.e2e.html',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase12IndexedDb = read('src/features/workout/storage/workoutIndexedDb.ts');
const phase12RecoveryStorage = read('src/features/workout/recovery/workoutRecoveryStorage.ts');
const phase12MutationStorage = read('src/features/workout/mutations/workoutMutationStorage.ts');
const phase12RecoveryHook = read('src/features/workout/hooks/useWorkoutRecovery.ts');
const phase12MutationHook = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
const phase12Vite = read('vite.config.ts');
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
ok(/await storageRef\.current!\.save\(userId, next\)/.test(phase12MutationHook), 'offline mutation enqueue awaits durable persistence before replay/result');
ok(/Promise<boolean>/.test(phase12MutationStorage), 'mutation storage reports whether a queue write was durably accepted');
ok(/could not save the workout change for safe retry/.test(phase12MutationHook), 'queue refuses network replay when durable persistence fails');
ok(/indexeddb:\s*resolve\(process\.cwd\(\),\s*['\"]indexeddb\.e2e\.html['\"]\)/.test(phase12Vite), 'native IndexedDB fixture is part of the existing E2E build gate');
const phase12ExerciseHook = read('src/features/workout/hooks/useWorkoutExercises.ts');
const phase12SetHook = read('src/features/workout/hooks/useWorkoutSets.ts');
ok(/resolvedWorkoutId/.test(phase12ExerciseHook) && /resolvedForCurrentWorkout/.test(phase12ExerciseHook) && /effectiveStatus/.test(phase12ExerciseHook), 'exercise hook does not expose stale ready state when the active workout identity changes');
ok(/resolvedExerciseKey/.test(phase12SetHook) && /resolvedForCurrentExercises/.test(phase12SetHook) && /effectiveStatus/.test(phase12SetHook), 'set hook does not expose stale ready state when exercise identities change');


// Phase 12B â€” offline shell + install UX
for (const rel of [
  'src/pwa/pwaService.ts',
  'src/pwa/usePwaLifecycle.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase12bSw = read('public/sw.js');
const phase12bRegister = read('src/pwa/registerServiceWorker.ts');
const phase12bService = read('src/pwa/pwaService.ts');
const phase12bManifest = JSON.parse(read('public/manifest.webmanifest'));
ok(/CACHE_PREFIX = 'workout-game-shell-'/.test(phase12bSw) && /const CACHE_VERSION = 'v\d+(?:-\d+)?'/.test(phase12bSw), 'current service worker retains an explicit versioned shell cache');
ok(/fetchForPrecache\('\/'\)/.test(phase12bSw) && /shellAssetPaths\(html\)/.test(phase12bSw), 'Phase 12B discovers and precaches built production shell assets from the deployed root HTML');
ok(/manifest\.webmanifest/.test(phase12bSw) && /icon-192\.png/.test(phase12bSw) && /icon-512\.png/.test(phase12bSw), 'Phase 12B precaches install metadata and icons');
ok(/url\.origin !== self\.location\.origin\) return/.test(phase12bSw), 'service worker ignores every cross-origin request rather than caching Supabase/auth/data traffic');
ok(/request\.mode === 'navigate'/.test(phase12bSw) && /cache\.match\('\/', \{ ignoreVary: true \}\)/.test(phase12bSw), 'navigation requests fall back to the cached production app shell offline');
ok(/cacheableDestination/.test(phase12bSw) && /cacheablePath/.test(phase12bSw), 'runtime caching is restricted to same-origin static application resources');
ok(/cache\.match\(request, \{ ignoreVary: true \}\)/.test(phase12bSw), 'same-origin shell assets ignore Vary header differences between precache and module requests');
ok(/key\.startsWith\(CACHE_PREFIX\) && key !== CACHE/.test(phase12bSw), 'activation removes superseded app-shell cache versions');
ok(/if \(!self\.registration\.active\) await self\.skipWaiting\(\)/.test(phase12bSw), 'first service-worker install may activate immediately without forcing later updates');
ok(/event\.data\?\.type === 'SKIP_WAITING'/.test(phase12bSw), 'later service-worker activation requires the explicit SKIP_WAITING message');
ok(!/self\.skipWaiting\(\);\s*\}\);\s*self\.addEventListener\('activate'/.test(phase12bSw), 'service-worker install no longer unconditionally skips waiting on updates');
ok(/registration\.waiting/.test(phase12bRegister) && /updatefound/.test(phase12bRegister), 'registration reports already-waiting and newly-installed updates');
ok(/controllerchange/.test(phase12bRegister) && /activateWaitingServiceWorker/.test(phase12bRegister), 'registration exposes explicit waiting-worker activation and controller-change lifecycle');
ok(/beforeinstallprompt/.test(phase12bService) && /installPrompt/.test(phase12bService), 'PWA service captures browser-supported install prompting');
ok(/appinstalled/.test(phase12bService) && /display-mode: standalone/.test(phase12bService) && /standalone\?/.test(phase12bService), 'PWA service tracks installed/standalone display mode across supported browsers');
ok(/applyUpdate/.test(phase12bService) && /snapshot\.applyingUpdate/.test(phase12bService) && /window\.location\.reload\(\)/.test(phase12bService), 'reload occurs only after an explicitly applied update changes the controller');
ok(/if \(cancelled \|\| !this\.snapshot\.applyingUpdate\) return/.test(phase12bService), 'ordinary service-worker controller changes never auto-reload the application');
ok(phase12bManifest.id === '/' && phase12bManifest.scope === '/' && phase12bManifest.display === 'standalone', 'manifest has stable root identity/scope and standalone display');
ok(phase12bManifest.icons.every((icon) => /maskable/.test(icon.purpose || '')), 'install icons are declared maskable-capable');


// Phase 12C â€” reconnect + retry hardening
for (const rel of [
  'src/features/workout/mutations/workoutMutationRetry.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase12cRetry = read('src/features/workout/mutations/workoutMutationRetry.ts');
const phase12cReplay = read('src/features/workout/mutations/workoutMutationReplay.ts');
const phase12cQueue = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
ok(/WORKOUT_MUTATION_AUTO_RETRY_LIMIT = 4/.test(phase12cRetry), 'Phase 12C caps each automatic mutation retry cycle at four attempts');
ok(/RETRY_BASE_DELAY_MS = 1_000/.test(phase12cRetry) && /2 \*\* \(attemptCount - 1\)/.test(phase12cRetry), 'Phase 12C retry policy uses persisted exponential backoff');
ok(/attemptCount === 0 \|\| item\.lastAttemptAtMs === null/.test(phase12cRetry) && /item\.lastAttemptAtMs \+ delay/.test(phase12cRetry), 'retry scheduling derives from queue-v1 persisted attempt metadata');
ok(/item\.status !== 'pending'/.test(phase12cRetry), 'automatic retry policy excludes failed and conflict queue items');
ok(/workoutMutationRetryBudgetExhausted\(nextAttemptCount\)/.test(phase12cReplay) && /retryBudgetExhausted \? 'failed'/.test(phase12cReplay), 'replay converts an exhausted retryable mutation into an explicit blocked item');
ok(/retryTimerRef/.test(phase12cQueue) && /window\.setTimeout/.test(phase12cQueue) && /workoutMutationNextAutoRetryAtMs/.test(phase12cQueue), 'mutation queue schedules bounded automatic replay rather than tight-loop retry');
ok(/connectivityRevision/.test(phase12cQueue) && /window\.addEventListener\('online'/.test(phase12cQueue), 'reconnect wakes the retry scheduler without creating a new queue item');
ok(/head\.status !== 'pending'/.test(phase12cQueue) && /workoutMutationCanAutoReplay\(head\)/.test(phase12cQueue), 'automatic replay only reaches eligible pending queue heads');
ok(/workoutMutationRetryBudgetExhausted\(item\.attemptCount\)/.test(phase12cQueue) && /status: 'failed' as const/.test(phase12cQueue), 'hydration normalizes pre-12C exhausted pending entries into blocked state');
ok(/attemptCount: 0/.test(phase12cQueue) && /lastAttemptAtMs: null/.test(phase12cQueue) && /const persisted = await replaceItems\(next\);\s*if \(!persisted\) return;/.test(phase12cQueue), 'manual Retry sync durably resets retry metadata before network replay');
ok(!/Background Sync/i.test(phase12cRetry) && !/supabase/i.test(phase12cRetry), 'Phase 12C retry policy is browser-local and does not introduce background-sync or Supabase coupling');


// Phase 12D â€” mobile PWA validation
for (const rel of [
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase12dService = read('src/pwa/pwaService.ts');
const phase12dQueue = read('src/features/workout/hooks/useWorkoutMutationQueue.ts');
const phase12dPlaywright = read('playwright.config.ts');
ok(/PwaPlatform = 'ios' \| 'android' \| 'other'/.test(phase12dService), 'Phase 12D classifies iOS, Android, and other PWA runtimes without user-agent-specific product branching elsewhere');
ok(/manualInstallAvailable/.test(phase12dService) && /platform === 'ios'/.test(phase12dService), 'iOS-class runtimes receive manual Home Screen install guidance rather than a fake native install prompt');
ok(/navigator\.storage\.persisted\(\)/.test(phase12dService) && /storagePersistence: persistent \? 'persistent' : 'best-effort'/.test(phase12dService), 'PWA lifecycle reports browser-authoritative persistent versus best-effort storage');
ok(/navigator\.storage\.persist\(\)/.test(phase12dService) && /requestPersistentStorage/.test(phase12dService), 'installed PWA can explicitly request persistent origin storage when supported');
ok(/visibilitychange/.test(phase12dService) && /pageshow/.test(phase12dService), 'PWA lifecycle refreshes runtime/storage state after mobile foreground and page restoration');
ok(/window\.addEventListener\('pageshow'/.test(phase12dQueue) && /document\.addEventListener\('visibilitychange'/.test(phase12dQueue), 'workout mutation queue wakes its existing retry scheduler after mobile resume');
ok(/chromium-android/.test(phase12dPlaywright) && /Pixel 7/.test(phase12dPlaywright) && /webkit-mobile/.test(phase12dPlaywright), 'Playwright matrix covers Android-class Chromium and iPhone-class WebKit');


// Phase 13A â€” per-exercise lifting analytics
for (const rel of [
  'src/features/progress/exerciseAnalytics.ts',
  'progress.e2e.html',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase13Analytics = read('src/features/progress/exerciseAnalytics.ts');
const phase13Hook = read('src/features/progress/hooks/useExerciseProgress.ts');
const phase13Vite = read('vite.config.ts');
ok(/buildExerciseAnalytics/.test(phase13Analytics) && /ExerciseProgressHistoryEntry/.test(phase13Analytics), 'Phase 13A derives analytics from the existing authoritative exercise-history contract');
ok(/sort\(byObservedAt\)/.test(phase13Analytics), 'Phase 13A normalizes lift history into chronological chart order');
ok(/sessionVolumeKgReps/.test(phase13Analytics) && /totalVolumeKgReps/.test(phase13Analytics), 'Phase 13A derives per-session and total volume analytics');
ok(/heaviestWeightKg/.test(phase13Analytics) && /maxCompletedReps/.test(phase13Analytics), 'Phase 13A derives true best completed working-set weight and reps');
ok(/isBaseline \|\| entry\.isPr \|\| entry\.isCurrentPr/.test(phase13Analytics) && /prTimeline/.test(phase13Analytics), 'Phase 13A exposes baseline and PR milestones without inventing new progression events');
ok(!/supabase/i.test(phase13Analytics) && !/from ['"](?:.*\/)?(?:scoring|domain)/i.test(phase13Analytics) && !/from ['"]react['"]/.test(phase13Analytics), 'Phase 13A analytics mapper stays pure and independent of Supabase, React, and scoring');
ok(/buildExerciseAnalytics/.test(phase13Hook) && /setHistory\(\[\]\);[\s\S]*setHistoryStatus\('loading'\)/.test(phase13Hook), 'progress hook derives analytics and clears stale history during exercise switches');
ok(/progress: resolve\(process\.cwd\(\), 'progress\.e2e\.html'\)/.test(phase13Vite), 'Phase 13A production E2E build includes the analytics fixture only in reliability mode');


// Phase 13B â€” weekly/monthly lifting summaries
for (const rel of [
  'supabase/migrations/20260822000100_lifting_calendar_summaries.sql',
  'supabase/tests/027_lifting_calendar_summaries.test.sql',
  'src/features/progress/liftingCalendarAnalytics.ts',
]) ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
const phase13bMigration = read('supabase/migrations/20260822000100_lifting_calendar_summaries.sql');
const phase13bDbTest = read('supabase/tests/027_lifting_calendar_summaries.test.sql');
const phase13bAnalytics = read('src/features/progress/liftingCalendarAnalytics.ts');
const phase13bService = read('src/features/progress/progressService.ts');
const phase13bHook = read('src/features/progress/hooks/useExerciseProgress.ts');
const phase13bPlan = Number((phase13bDbTest.match(/select\s+plan\((\d+)\)/i)||[])[1]);
const phase13bCount=(phase13bDbTest.match(/select\s+(?:has_function|results_eq|throws_ok|cmp_ok|is)\s*\(/gi)||[]).length;
ok(/get_my_lifting_calendar_summaries/.test(phase13bMigration) && /p_week_count integer default 12/.test(phase13bMigration) && /p_month_count integer default 6/.test(phase13bMigration), 'Phase 13B adds one bounded focused calendar-summary RPC');
ok(/auth\.uid\(\)/.test(phase13bMigration) && /from public\.profiles/.test(phase13bMigration) && /at time zone v_timezone/.test(phase13bMigration), 'Phase 13B calendar anchoring is authenticated-user scoped and profile-timezone aware');
ok(/source = 'IN_APP'/.test(phase13bMigration) && /status = 'COMPLETED'/.test(phase13bMigration) && /category = 'STRENGTH'/.test(phase13bMigration), 'Phase 13B aggregates only completed in-app strength sessions');
ok(/set_type = 'WORKING'/.test(phase13bMigration) && /ws\.completed/.test(phase13bMigration) && /coalesce\(ws\.reps, 0\) >= 1/.test(phase13bMigration), 'Phase 13B counts only completed working sets with at least one rep');
ok(/generate_series/.test(phase13bMigration) && /weekly_periods/.test(phase13bMigration) && /monthly_periods/.test(phase13bMigration), 'Phase 13B returns explicit calendar buckets including zero-activity periods');
ok(/previous_pr_value is not null/.test(phase13bMigration) && /metric_value > o\.previous_pr_value/.test(phase13bMigration), 'Phase 13B PR counts exclude baselines and reuse authoritative improvement semantics');
ok(/revoke all on function public\.get_my_lifting_calendar_summaries/.test(phase13bMigration) && /grant execute on function public\.get_my_lifting_calendar_summaries/.test(phase13bMigration), 'Phase 13B calendar RPC is authenticated-only');
ok(/gs\.bucket_start/.test(phase13bMigration) && !/\bperiod_start::date as period_start\b/.test(phase13bMigration), 'Phase 13B primary migration keeps generated calendar buckets unambiguous');
ok(/bucket_start/.test(phase13bMigration) && /bucket_end/.test(phase13bMigration) && /session_total/.test(phase13bMigration) && /pr_total/.test(phase13bMigration), 'Phase 13B primary migration keeps internal aggregate names distinct from RETURNS TABLE output variables');
ok(Number.isInteger(phase13bPlan) && phase13bPlan===phase13bCount && phase13bPlan>=15, 'Phase 13B pgTAP plan covers authorization, privacy, aggregates, PRs, and validation');
ok(!/insert into public\.exercise_progress_observations/i.test(phase13bDbTest) && /Source-row triggers reconcile authoritative progression automatically/.test(phase13bDbTest), 'Phase 13B pgTAP fixture uses authoritative source rows instead of manually fabricating derived progression observations');
ok(/get_my_lifting_calendar_summaries/.test(phase13bService) && /p_week_count: 12/.test(phase13bService) && /p_month_count: 6/.test(phase13bService), 'Phase 13B service maps one bounded calendar-summary request instead of N exercise-history calls');
ok(/buildLiftingCalendarAnalytics/.test(phase13bAnalytics) && /weekDelta/.test(phase13bAnalytics) && /monthDelta/.test(phase13bAnalytics), 'Phase 13B pure analytics derives current-versus-previous week/month trend context');
ok(!/supabase/i.test(phase13bAnalytics) && !/from ['"]react['"]/.test(phase13bAnalytics) && !/scoring\//i.test(phase13bAnalytics), 'Phase 13B calendar analytics stays pure and independent of Supabase, React, and scoring');
ok(/calendarStatus/.test(phase13bHook) && /calendarError/.test(phase13bHook) && /retryCalendar/.test(phase13bHook), 'Phase 13B summary loading and retry state is isolated from per-exercise analytics');


// Phase 5.6.1 â€” targeted user invitations
const targetedInviteMigration = read('supabase/migrations/20260819001100_targeted_group_invitations.sql');
const targetedInviteTest = read('supabase/tests/016_targeted_group_invitations.test.sql');
const targetedInvitePlan = Number((targetedInviteTest.match(/select\s+plan\((\d+)\)/i)||[])[1]);
const targetedInviteCount=(targetedInviteTest.match(/select\s+(?:has_table|has_column|has_function|col_is_pk|results_eq|throws_ok|lives_ok|is)\s*\(/gi)||[]).length;
ok(/profile_code/.test(targetedInviteMigration),'profiles receive stable invite IDs');
ok(/drop function if exists public\.join_group_by_invite/.test(targetedInviteMigration),'legacy reusable join RPC is retired');
ok(/create_group_invite/.test(targetedInviteMigration)&&/accept_group_invite/.test(targetedInviteMigration)&&/decline_group_invite/.test(targetedInviteMigration),'targeted invite lifecycle RPCs exist');
ok((targetedInviteMigration.match(/delete from public\.group_invites/g)||[]).length >= 4,'accept, decline, revoke, and legacy cleanup remove inactive invite rows');
ok(/is null or v_role not in/.test(targetedInviteMigration),'targeted invite admin checks reject null/outsider roles');
ok(Number.isInteger(targetedInvitePlan) && targetedInvitePlan===targetedInviteCount && targetedInvitePlan>=29,'targeted invitation pgTAP plan covers the full recipient lifecycle');

console.log(`Project structural validation passed: ${assertions} assertions.`);
