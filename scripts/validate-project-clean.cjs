const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const primaryMigrationPath = path.join(
  root,
  'supabase/migrations/20260822000100_lifting_calendar_summaries.sql',
);
const obsoleteRepairPath = path.join(
  root,
  'supabase/migrations/20260822000200_fix_lifting_calendar_summaries.sql',
);
const phase15MigrationPath = path.join(
  root,
  'supabase/migrations/20260822000300_platform_admin_authorization_audit.sql',
);
const phase15TestPath = path.join(
  root,
  'supabase/tests/028_platform_admin_authorization_audit.test.sql',
);
const phase152bMigrationPath = path.join(
  root,
  'supabase/migrations/20260822040727_platform_capacity_local_telemetry.sql',
);
const phase152bTestPath = path.join(
  root,
  'supabase/tests/029_platform_capacity_local_telemetry.test.sql',
);
const phase152cFiles = [
  'src/features/admin/capacity/supabaseManagementProvider.ts',
  'supabase/functions/platform-capacity-supabase/index.ts',
  'PHASE15.2C-PATCH-MANIFEST.txt',
];

const phase152aFiles = [
  'src/features/admin/capacity/model.ts',
  'src/features/admin/capacity/capacityMath.ts',
  'src/features/admin/capacity/provider.ts',
  'PHASE15.2A-PATCH-MANIFEST.txt',
];

function fail(message) {
  throw new Error(`Release validation failed: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

if (fs.existsSync(obsoleteRepairPath)) {
  fail('obsolete Phase 13B repair migration must not exist');
}

const primaryMigration = fs.readFileSync(primaryMigrationPath, 'utf8');
if (!/gs\.bucket_start/.test(primaryMigration)) {
  fail('primary Phase 13B migration must use unambiguous generated-period aliases');
}
if (!/session_total/.test(primaryMigration) || !/pr_total/.test(primaryMigration)) {
  fail('primary Phase 13B migration must keep aggregate aliases distinct from RETURNS TABLE names');
}
if (/\bperiod_start::date as period_start\b/.test(primaryMigration)) {
  fail('primary Phase 13B migration reintroduces the PL/pgSQL output-variable ambiguity');
}

if (!fs.existsSync(phase15MigrationPath)) fail('Phase 15.1 platform-admin migration exists');
if (!fs.existsSync(phase15TestPath)) fail('Phase 15.1 pgTAP authorization test exists');

const phase15Migration = fs.readFileSync(phase15MigrationPath, 'utf8');
for (const requiredFragment of [
  'create schema if not exists private',
  'create table private.platform_account_state',
  'create table private.platform_admins',
  'create table private.platform_admin_audit_log',
  'function private.bootstrap_platform_admin',
  'function public.get_my_platform_access',
  'function public.grant_platform_admin',
  'function public.revoke_platform_admin',
  'Final platform administrator cannot be revoked',
  'Final platform administrator must remain active',
  'Platform admin audit records are immutable',
  "set search_path = ''",
]) {
  if (!phase15Migration.includes(requiredFragment)) {
    fail(`Phase 15.1 migration missing required invariant: ${requiredFragment}`);
  }
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase15Migration)) {
  fail('Phase 15.1 must not grant browser roles direct access to private operational objects');
}
if (/grant\s+execute\s+on\s+function\s+private\.bootstrap_platform_admin/i.test(phase15Migration)) {
  fail('Phase 15.1 bootstrap function must remain operator-only');
}

const phase15Test = fs.readFileSync(phase15TestPath, 'utf8');
const phase15Plan = Number((phase15Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase15Assertions = (phase15Test.match(/select\s+(?:has_type|has_table|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi) || []).length;
if (phase15Plan !== phase15Assertions) {
  fail(`Phase 15.1 pgTAP plan ${phase15Plan} must match ${phase15Assertions} assertions`);
}
if (phase15Plan < 30) fail('Phase 15.1 authorization suite must retain comprehensive coverage');
if (/before_state->>'is_platform_admin'\s*\|\|/.test(phase15Test)
    || /after_state->>'is_platform_admin'\s*\|\|/.test(phase15Test)) {
  fail('Phase 15.1 pgTAP audit-state concatenation must parenthesize JSON text extraction before ||');
}
if (!/\(before_state->>'is_platform_admin'\)\s*\|\|/.test(phase15Test)
    || !/\(after_state->>'is_platform_admin'\)/.test(phase15Test)) {
  fail('Phase 15.1 pgTAP must retain the hosted-verified parenthesized audit-state assertion');
}
const lazyFeatureModules = {
  dashboard: '../dashboard/components/DashboardController',
  cardio: '../cardio/components/CardioController',
  groups: '../groups/components/GroupAdministrationController',
  progress: '../progress/components/ExerciseProgressController',
  social: '../social/components/GroupSocialController',
  workout: '../workout/components/WorkoutController',
};

const viteConfig = read('vite.config.ts');
if (!/rolldownOptions/.test(viteConfig) || !/codeSplitting/.test(viteConfig)) {
  fail('Vite production build must use Rolldown code splitting');
}
if (!/react-vendor/.test(viteConfig) || !/supabase-vendor/.test(viteConfig)) {
  fail('Vite production build must separate React and Supabase vendor chunks');
}
if (!/fitness-asset-manifest/.test(viteConfig) || !/asset-manifest\.json/.test(viteConfig)) {
  fail('Vite production build must emit the offline asset manifest for lazy chunks');
}

const serviceWorker = read('public/sw.js');
if (!/const\s+CACHE_VERSION\s*=\s*['"][^'"]+['"]/.test(serviceWorker)) {
  fail('current service worker must declare an explicit cache version');
}
if (!/const\s+CACHE\s*=\s*`\$\{CACHE_PREFIX\}\$\{CACHE_VERSION\}`/.test(serviceWorker)) {
  fail('service-worker cache name must be composed from the stable prefix and explicit cache version');
}
if (!/asset-manifest\.json/.test(serviceWorker) || !/emittedAssetPaths/.test(serviceWorker)) {
  fail('service worker must precache emitted lazy chunks through the asset manifest');
}

const bundleGuard = read('scripts/check-bundle-size.cjs');
if (!/500_000/.test(bundleGuard) || !/Bundle budget failed/.test(bundleGuard)) {
  fail('bundle guard must enforce the 500 kB JavaScript chunk budget');
}
const packageJson = JSON.parse(read('package.json'));
if (!String(packageJson.scripts?.build || '').includes('check-bundle-size.cjs')) {
  fail('normal production build must execute the bundle-size gate');
}
for (const relativePath of phase152aFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15.2A file missing: ${relativePath}`);
}

if (!fs.existsSync(phase152bMigrationPath)) fail('Phase 15.2B capacity telemetry migration exists');
if (!fs.existsSync(phase152bTestPath)) fail('Phase 15.2B capacity telemetry pgTAP test exists');
if (!fs.existsSync(path.join(root, 'PHASE15.2B-PATCH-MANIFEST.txt'))) {
  fail('Phase 15.2B patch manifest exists');
}

const phase152bMigration = fs.readFileSync(phase152bMigrationPath, 'utf8');
for (const requiredFragment of [
  'create table private.platform_capacity_allowances',
  'create table private.platform_capacity_snapshots',
  'create table private.platform_capacity_snapshot_metrics',
  'function private.read_database_local_capacity_metrics',
  'function public.get_platform_capacity_current',
  'function public.capture_platform_capacity_snapshot',
  'function public.get_platform_capacity_history',
  'private.require_active_platform_admin()',
  'database_bytes',
  'storage_bytes',
  'storage_objects',
  'postgres_connections',
  'auth_users_total',
  'auth_users_30d',
  'not Supabase billable monthly active users',
  'Platform capacity snapshots are immutable',
  "set search_path = ''",
]) {
  if (!phase152bMigration.includes(requiredFragment)) {
    fail(`Phase 15.2B migration missing required invariant: ${requiredFragment}`);
  }
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase152bMigration)) {
  fail('Phase 15.2B must not grant browser roles direct access to private capacity objects');
}
for (const rpc of [
  'public.get_platform_capacity_current()',
  'public.capture_platform_capacity_snapshot()',
  'public.get_platform_capacity_history(integer)',
]) {
  if (!phase152bMigration.includes(`grant execute on function ${rpc} to authenticated`)) {
    fail(`Phase 15.2B must grant authenticated callers only the guarded RPC boundary: ${rpc}`);
  }
}

const phase152bTest = fs.readFileSync(phase152bTestPath, 'utf8');
const phase152bPlan = Number((phase152bTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase152bAssertions = (phase152bTest.match(/select\s+(?:has_table|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi) || []).length;
if (phase152bPlan !== phase152bAssertions) {
  fail(`Phase 15.2B pgTAP plan ${phase152bPlan} must match ${phase152bAssertions} assertions`);
}
if (phase152bPlan < 40) fail('Phase 15.2B capacity authorization/history suite must retain comprehensive coverage');
for (const requiredCoverage of [
  'group OWNER cannot read platform capacity telemetry',
  'group ADMIN cannot read platform capacity history',
  'suspended platform administrator cannot read current capacity telemetry',
  'unauthenticated caller cannot read capacity telemetry',
  'snapshot headers cannot be updated',
  'snapshot metric history cannot be deleted',
]) {
  if (!phase152bTest.includes(requiredCoverage)) {
    fail(`Phase 15.2B pgTAP missing authorization/history coverage: ${requiredCoverage}`);
  }
}
const capacityModel = read('src/features/admin/capacity/model.ts');
const capacityMath = read('src/features/admin/capacity/capacityMath.ts');
const capacityProvider = read('src/features/admin/capacity/provider.ts');
if (!/watch:\s*60/.test(capacityModel) || !/warning:\s*75/.test(capacityModel) || !/critical:\s*85/.test(capacityModel)) {
  fail('Phase 15.2A must retain the 60/75/85 default planning thresholds');
}
for (const status of ['UNAVAILABLE', 'UNCONFIGURED', 'NORMAL', 'WATCH', 'WARNING', 'CRITICAL', 'EXCEEDED']) {
  if (!capacityModel.includes(`'${status}'`)) fail(`capacity model missing status ${status}`);
}
for (const metricCode of [
  'database_bytes',
  'storage_bytes',
  'storage_objects',
  'postgres_connections',
  'auth_users_total',
  'auth_users_30d',
]) {
  if (!capacityModel.includes(`'${metricCode}'`)) fail(`capacity model missing database-local metric ${metricCode}`);
}
for (const source of ['DATABASE_LOCAL', 'SUPABASE_MANAGEMENT', 'NETLIFY_API']) {
  if (!capacityModel.includes(`'${source}'`) || !capacityProvider.includes('CapacityTelemetryProvider')) {
    fail(`Phase 15.2A provider contract missing ${source}`);
  }
}
if (/react|supabase-js|getSupabaseClient/i.test(capacityMath)) {
  fail('capacity math must stay pure and independent of React/Supabase clients');
}
if (!/utilizationPercent >= 100/.test(capacityMath)
    || !/checkedThresholds\.critical/.test(capacityMath)
    || !/checkedThresholds\.warning/.test(capacityMath)
    || !/checkedThresholds\.watch/.test(capacityMath)) {
  fail('capacity assessment must preserve ordered exceeded/critical/warning/watch semantics');
}
if (!/elapsedDays <= 0 \|\| growth <= 0/.test(capacityMath) || !/previous\.source !== current\.source/.test(capacityMath)) {
  fail('capacity growth math must reject invalid time/growth and mismatched sources');
}
if (/process\.env|import\.meta\.env|service[_-]?role|management[_-]?token|access[_-]?token/i.test(capacityProvider)) {
  fail('provider contract must not embed or read infrastructure credentials');
}

for (const relativePath of phase152cFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15.2C file missing: ${relativePath}`);
}
for (const metricCode of [
  'supabase_monthly_active_users',
  'supabase_egress_bytes',
  'supabase_cached_egress_bytes',
  'supabase_realtime_messages',
  'supabase_realtime_peak_connections',
]) {
  if (!capacityModel.includes(`'${metricCode}'`)) fail(`Phase 15.2C provider metric missing: ${metricCode}`);
}
if (capacityModel.includes("'supabase_realtime_usage'")) {
  fail('Phase 15.2C must not retain the ambiguous supabase_realtime_usage placeholder');
}
if (!/CapacityMetricScope = 'PROJECT' \| 'ORGANIZATION'/.test(capacityModel)) {
  fail('Phase 15.2C must distinguish project and organization capacity scope');
}
const supabaseManagementProvider = read('src/features/admin/capacity/supabaseManagementProvider.ts');
const supabaseProviderFunction = read('supabase/functions/platform-capacity-supabase/index.ts');
for (const fragment of [
  'SUPABASE_MANAGEMENT_METRIC_CODES',
  "scope: 'ORGANIZATION'",
  "billingUsageApi: 'UNAVAILABLE'",
  'createSupabaseManagementCapacityProvider',
  'value: null',
  'limit: null',
]) {
  if (!supabaseManagementProvider.includes(fragment)) fail(`Phase 15.2C client adapter missing invariant: ${fragment}`);
}
if (/process\.env|import\.meta\.env|SUPABASE_MANAGEMENT_ACCESS_TOKEN|SUPABASE_ORGANIZATION_SLUG|api\.supabase\.com/i.test(supabaseManagementProvider)) {
  fail('Phase 15.2C browser adapter must not read or embed Management API credentials/endpoints');
}
for (const fragment of [
  'SUPABASE_MANAGEMENT_ACCESS_TOKEN',
  'SUPABASE_ORGANIZATION_SLUG',
  'https://api.supabase.com',
  "rpc('get_my_platform_access')",
  "access.account_status === 'ACTIVE'",
  'access.is_platform_admin === true',
  "{ error: 'Not found' }",
  '/v1/organizations/${encodedSlug}',
  '/v1/organizations/${encodedSlug}/entitlements',
  "billingUsageApi: 'UNAVAILABLE'",
  'value: null',
  'limit: null',
]) {
  if (!supabaseProviderFunction.includes(fragment)) fail(`Phase 15.2C Edge boundary missing invariant: ${fragment}`);
}
if (/service[_-]?role/i.test(supabaseProviderFunction)) {
  fail('Phase 15.2C Edge boundary must authorize the caller with their user JWT, not a service-role browser substitute');
}
if (/api\.supabase\.com\/v1\/organizations\/[^'`"]+\/usage/i.test(supabaseProviderFunction)) {
  fail('Phase 15.2C must not invent an undocumented Supabase organization usage endpoint');
}
if (!/\[functions\.platform-capacity-supabase\][\s\S]*verify_jwt\s*=\s*true/.test(read('supabase/config.toml'))) {
  fail('Phase 15.2C Edge Function must explicitly verify authenticated user JWTs');
}
for (const relativePath of [
  'src/features/admin/capacity/netlifyApiProvider.ts',
  'supabase/functions/platform-capacity-netlify/index.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15.2D file missing: ${relativePath}`);
}
if (!/CapacityMetricScope = 'PROJECT' \| 'ORGANIZATION' \| 'ACCOUNT'/.test(capacityModel)) {
  fail('Phase 15.2D must model Netlify billing with explicit ACCOUNT scope');
}
const netlifyApiProvider = read('src/features/admin/capacity/netlifyApiProvider.ts');
const netlifyProviderFunction = read('supabase/functions/platform-capacity-netlify/index.ts');
for (const fragment of [
  'NETLIFY_API_METRIC_CODES',
  "scope: 'ACCOUNT'",
  "billingUsageApi: 'UNAVAILABLE'",
  'createNetlifyApiCapacityProvider',
  'value: null',
  'limit: null',
]) {
  if (!netlifyApiProvider.includes(fragment)) fail(`Phase 15.2D client adapter missing invariant: ${fragment}`);
}
if (/process\.env|import\.meta\.env|NETLIFY_ACCESS_TOKEN|NETLIFY_ACCOUNT_ID|api\.netlify\.com/i.test(netlifyApiProvider)) {
  fail('Phase 15.2D browser adapter must not read or embed Netlify credentials/endpoints');
}
for (const fragment of [
  'NETLIFY_ACCESS_TOKEN',
  'NETLIFY_ACCOUNT_ID',
  'NETLIFY_SITE_ID',
  'https://api.netlify.com/api/v1',
  "rpc('get_my_platform_access')",
  "access.account_status === 'ACTIVE'",
  'access.is_platform_admin === true',
  "{ error: 'Not found' }",
  '/accounts/${encodeURIComponent(accountId)}',
  '/sites/${encodeURIComponent(siteId)}',
  "site.account_id === verifiedAccountId",
  "billingUsageApi: 'UNAVAILABLE'",
  'value: null',
  'limit: null',
]) {
  if (!netlifyProviderFunction.includes(fragment)) fail(`Phase 15.2D Edge boundary missing invariant: ${fragment}`);
}
if (/api\.netlify\.com\/api\/v1\/accounts\/[^'`"]+\/(usage|bandwidth|billing)/i.test(netlifyProviderFunction)) {
  fail('Phase 15.2D must not invent an undocumented Netlify account-usage endpoint');
}
if (!/\[functions\.platform-capacity-netlify\][\s\S]*verify_jwt\s*=\s*true/.test(read('supabase/config.toml'))) {
  fail('Phase 15.2D Edge Function must explicitly verify authenticated user JWTs');
}

// Phase 15.2E dashboard anti-AI and real-data UI contract.
for (const relativePath of [
  'public/_redirects',
  'src/lib/appNavigation.ts',
  'src/features/admin/platformAccessService.ts',
  'src/features/admin/hooks/usePlatformAccess.ts',
  'src/features/admin/capacity/dashboardModel.ts',
  'src/features/admin/capacity/capacityDashboardService.ts',
  'src/features/admin/capacity/hooks/useCapacityDashboard.ts',
  'src/features/admin/capacity/formatCapacity.ts',
] ) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.2E file missing: ' + relativePath);
}
const capacityService152e = read('src/features/admin/capacity/capacityDashboardService.ts');
const netlifyRedirects152e = read('public/_redirects');
for (const rpc of ['get_platform_capacity_current', 'get_platform_capacity_history', 'capture_platform_capacity_snapshot']) {
  if (!capacityService152e.includes(rpc)) fail('Phase 15.2E capacity service missing RPC: ' + rpc);
}
for (const providerFunction of ['platform-capacity-supabase', 'platform-capacity-netlify']) {
  if (!capacityService152e.includes(providerFunction)) fail('Phase 15.2E capacity service missing provider boundary: ' + providerFunction);
}
if (!/\/\*\s+\/index\.html\s+200/.test(netlifyRedirects152e)) {
  fail('Phase 15.2E direct admin/settings routes require the Netlify SPA fallback');
}

// Phase 15.3A account directory + lifecycle foundation.
const phase153aMigrationPath = path.join(
  root,
  'supabase/migrations/20260822120300_platform_account_administration_foundation.sql',
);
const phase153aTestPath = path.join(
  root,
  'supabase/tests/030_platform_account_administration_foundation.test.sql',
);
for (const relativePath of [
  'src/features/admin/accounts/model.ts',
  'src/features/admin/accounts/platformAccountAdminService.ts',
  'src/features/admin/accounts/index.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3A file missing: ' + relativePath);
}
if (!fs.existsSync(phase153aMigrationPath)) fail('Phase 15.3A account-administration migration exists');
if (!fs.existsSync(phase153aTestPath)) fail('Phase 15.3A account-administration pgTAP test exists');

const phase153aMigration = fs.readFileSync(phase153aMigrationPath, 'utf8');
for (const fragment of [
  'suspension_review_at',
  'deletion_requested_at',
  'deletion_previous_status',
  'function private.require_active_account',
  'function public.list_platform_accounts',
  'function public.get_platform_account_detail',
  'function public.suspend_platform_account',
  'function public.restore_platform_account',
  'function public.request_platform_account_deletion',
  'function public.cancel_platform_account_deletion',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_RESTORED',
  'ACCOUNT_DELETION_REQUESTED',
  'ACCOUNT_DELETION_CANCELLED',
  'Platform administrator cannot suspend own account',
  'Platform administrator cannot request own account deletion',
  'Platform administrator must be revoked before account deletion',
  'private.require_active_platform_admin()',
  "set search_path = ''",
]) {
  if (!phase153aMigration.includes(fragment)) fail('Phase 15.3A migration missing invariant: ' + fragment);
}
if (/email\b|encrypted_password|refresh_token|access_token|raw_user_meta_data|raw_app_meta_data/i.test(
  phase153aMigration.match(/create or replace function public\.list_platform_accounts[\s\S]*?end;\n\$\$;/)?.[0] || '',
)) {
  fail('Phase 15.3A account directory must not expose email/password/token/raw Auth metadata');
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase153aMigration)) {
  fail('Phase 15.3A must not grant browser roles direct access to private account-administration objects');
}
for (const rpc of [
  'public.list_platform_accounts(text, public.platform_account_status, integer, integer)',
  'public.get_platform_account_detail(uuid)',
  'public.suspend_platform_account(uuid, text, timestamptz)',
  'public.restore_platform_account(uuid, text)',
  'public.request_platform_account_deletion(uuid, text)',
  'public.cancel_platform_account_deletion(uuid, text)',
]) {
  if (!phase153aMigration.includes('grant execute on function ' + rpc)) {
    fail('Phase 15.3A missing authenticated guarded RPC grant: ' + rpc);
  }
}

const phase153aTest = fs.readFileSync(phase153aTestPath, 'utf8');
const phase153aPlan = Number((phase153aTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase153aAssertions = (phase153aTest.match(
  /select\s+(?:has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase153aPlan !== phase153aAssertions) {
  fail('Phase 15.3A pgTAP plan ' + phase153aPlan + ' must match ' + phase153aAssertions + ' assertions');
}
if (phase153aPlan < 60) fail('Phase 15.3A authorization/lifecycle suite must retain comprehensive coverage');
for (const coverage of [
  'administrator cannot suspend their own account',
  'administrator cannot request deletion of their own account',
  'platform administrator must be revoked before deletion can be requested',
  'private active-account guard rejects suspended users',
  'private active-account guard rejects deletion-pending users',
  'deletion cancellation losslessly restores prior suspended state',
  'group OWNER cannot read platform account directory',
  'suspended platform administrator cannot read account directory',
  '15.3A deletion flow never physically deletes Auth users',
]) {
  if (!phase153aTest.includes(coverage)) fail('Phase 15.3A pgTAP missing coverage: ' + coverage);
}

const phase153aService = read('src/features/admin/accounts/platformAccountAdminService.ts');
for (const rpc of [
  'list_platform_accounts',
  'get_platform_account_detail',
  'request_platform_account_deletion',
  'cancel_platform_account_deletion',
]) {
  if (!phase153aService.includes(rpc)) fail('Phase 15.3A browser-safe service missing RPC: ' + rpc);
}
if (/service[_-]?role|SUPABASE_SECRET|encrypted_password|refresh_token|access_token/i.test(phase153aService)) {
  fail('Phase 15.3A browser account service must not contain privileged Auth credentials or token fields');
}

// Phase 15.3B Data API/session enforcement + server-only Auth coordination.
const phase153bMigrationPath = path.join(
  root,
  'supabase/migrations/20260822161454_platform_account_suspension_enforcement.sql',
);
const phase153bTestPath = path.join(
  root,
  'supabase/tests/031_platform_account_suspension_enforcement.test.sql',
);
const phase153bHardeningPath = path.join(
  root,
  'supabase/migrations/20260822161801_harden_active_account_pre_request.sql',
);
const phase153bHookSchemaPath = path.join(
  root,
  'supabase/migrations/20260822162155_move_account_hooks_out_of_data_api.sql',
);
for (const relativePath of [
  'PHASE15.3B-PATCH-MANIFEST.txt',
  'supabase/functions/platform-account-auth/index.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3B file missing: ' + relativePath);
}
if (!fs.existsSync(phase153bMigrationPath)) fail('Phase 15.3B suspension-enforcement migration exists');
if (!fs.existsSync(phase153bHardeningPath)) fail('Phase 15.3B pre-request hardening migration exists');
if (!fs.existsSync(phase153bHookSchemaPath)) fail('Phase 15.3B non-exposed hook-schema migration exists');
if (!fs.existsSync(phase153bTestPath)) fail('Phase 15.3B suspension-enforcement pgTAP test exists');

const phase153bMigration = fs.readFileSync(phase153bMigrationPath, 'utf8');
for (const fragment of [
  'private.platform_auth_coordination',
  'function public.is_current_account_session_active',
  'function public.enforce_active_account_request',
  'function public.prepare_platform_account_auth_transition',
  'function public.complete_platform_account_auth_transition',
  "pgrst.db_pre_request = 'public.enforce_active_account_request'",
  "notify pgrst, 'reload config'",
  'join auth.sessions',
  "pas.status = 'ACTIVE'::public.platform_account_status",
  'Stale Auth coordination revision',
  'AUTH_ADMIN_UPDATE_FAILED',
  'profile_pictures_insert_own',
  '(select public.is_current_account_session_active())',
  "set search_path = ''",
]) {
  if (!phase153bMigration.includes(fragment)) fail('Phase 15.3B migration missing invariant: ' + fragment);
}
for (const signature of [
  'public.suspend_platform_account(uuid, text, timestamptz)',
  'public.restore_platform_account(uuid, text)',
]) {
  if (!phase153bMigration.includes('revoke all on function ' + signature)) {
    fail('Phase 15.3B must revoke the browser-bypass RPC: ' + signature);
  }
}
const normalizedPhase153bMigration = phase153bMigration.replace(/\s+/g, ' ').trim();
for (const signature of [
  'public.prepare_platform_account_auth_transition(uuid, uuid, text, text, timestamptz)',
  'public.complete_platform_account_auth_transition(uuid, uuid, bigint, boolean, text)',
]) {
  const expectedGrant = 'grant execute on function ' + signature + ' to service_role;';
  if (!normalizedPhase153bMigration.includes(expectedGrant)) {
    fail('Phase 15.3B missing service-role-only coordination grant: ' + signature);
  }
}
if (/grant\s+execute\s+on\s+function\s+public\.(?:prepare|complete)_platform_account_auth_transition[^;]*\bto\s+authenticated/i.test(phase153bMigration)) {
  fail('Phase 15.3B Auth coordination RPCs must never be executable by the browser role');
}

const phase153bHardening = fs.readFileSync(phase153bHardeningPath, 'utf8');
for (const fragment of [
  'security invoker',
  'public.is_current_account_session_active()',
  'Account or session is not active',
  'to authenticator',
]) {
  if (!phase153bHardening.toLowerCase().includes(fragment.toLowerCase())) {
    fail('Phase 15.3B pre-request hardening missing invariant: ' + fragment);
  }
}

const phase153bHookSchema = fs.readFileSync(phase153bHookSchemaPath, 'utf8');
for (const fragment of [
  'create schema if not exists api_hooks',
  'set schema api_hooks',
  "pgrst.db_pre_request = 'api_hooks.enforce_active_account_request'",
  'grant usage on schema api_hooks',
]) {
  if (!phase153bHookSchema.includes(fragment)) {
    fail('Phase 15.3B non-exposed hook schema missing invariant: ' + fragment);
  }
}

const phase153bTest = fs.readFileSync(phase153bTestPath, 'utf8');
const phase153bPlan = Number((phase153bTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase153bAssertions = (phase153bTest.match(
  /select\s+(?:has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase153bPlan !== phase153bAssertions) {
  fail('Phase 15.3B pgTAP plan ' + phase153bPlan + ' must match ' + phase153bAssertions + ' assertions');
}
if (phase153bPlan < 50) fail('Phase 15.3B enforcement/session suite must retain comprehensive coverage');
for (const coverage of [
  'issued JWT without a matching auth.sessions row is rejected immediately',
  'session past not_after is rejected',
  'suspended account is rejected even when its previously issued session row still exists',
  'Auth ban failure leaves database suspension authoritative',
  'restore remains fail-closed until Auth unban completes',
  'stale Edge Function completion cannot overwrite a newer transition',
  'DELETION_PENDING account is rejected across the Data API boundary',
  '15.3B enforcement and coordination never physically delete user profiles',
]) {
  if (!phase153bTest.includes(coverage)) fail('Phase 15.3B pgTAP missing coverage: ' + coverage);
}

const phase153bFunction = read('supabase/functions/platform-account-auth/index.ts');
for (const fragment of [
  'auth.getUser(token)',
  "rpc('get_my_platform_access')",
  'SUPABASE_SERVICE_ROLE_KEY',
  "'prepare_platform_account_auth_transition'",
  "rpc('complete_platform_account_auth_transition'",
  'ban_duration: banDuration',
  "'876000h'",
  "'none'",
  'AUTH_COORDINATION_FAILED',
]) {
  if (!phase153bFunction.includes(fragment)) fail('Phase 15.3B Edge Function missing invariant: ' + fragment);
}
if (/VITE_|serviceRoleKey.*jsonResponse|SUPABASE_SERVICE_ROLE_KEY.*body/i.test(phase153bFunction)) {
  fail('Phase 15.3B Edge Function must never expose the service-role credential');
}
if (!/\[functions\.platform-account-auth\][\s\S]*?verify_jwt\s*=\s*true/.test(read('supabase/config.toml'))) {
  fail('Phase 15.3B Edge Function must require JWT verification');
}
for (const fragment of [
  "functions.invoke('platform-account-auth'",
  "action: 'SUSPEND'",
  "action: 'RESTORE'",
]) {
  if (!phase153aService.includes(fragment)) fail('Phase 15.3B browser service missing server boundary: ' + fragment);
}
if (/client\.rpc\(['"](?:suspend_platform_account|restore_platform_account)/.test(phase153aService)) {
  fail('Phase 15.3B browser service must not retain direct state-only suspension/restore calls');
}

// Phase 15.3C irreversible administrator + self-service deletion engine.
const phase153cMigrationPath = path.join(
  root,
  'supabase/migrations/20260822172823_platform_account_irreversible_deletion.sql',
);
const phase153cTestPath = path.join(
  root,
  'supabase/tests/032_platform_account_irreversible_deletion.test.sql',
);
for (const relativePath of [
  'PHASE15.3C-PATCH-MANIFEST.txt',
  'src/features/settings/accountDeletionService.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3C file missing: ' + relativePath);
}
if (!fs.existsSync(phase153cMigrationPath)) fail('Phase 15.3C irreversible-deletion migration exists');
if (!fs.existsSync(phase153cTestPath)) fail('Phase 15.3C irreversible-deletion pgTAP test exists');

const phase153cMigration = fs.readFileSync(phase153cMigrationPath, 'utf8');
for (const fragment of [
  'create table private.platform_account_deletion_jobs',
  'function public.request_own_platform_account_deletion',
  'function public.cancel_own_platform_account_deletion',
  'function public.prepare_platform_account_deletion',
  'function public.mark_platform_account_deletion_storage_cleared',
  'function public.record_platform_account_deletion_failure',
  'auth_users_begin_platform_account_delete',
  'profiles_finalize_platform_account_delete',
  'Group ownership must be transferred before account deletion',
  "format('DELETE %s', v_username)",
  "status = 'AUTH_DELETE_STARTED'",
  "status = 'COMPLETED'",
  "'ACCOUNT_DELETION_CONFIRMED'",
  "'ACCOUNT_DELETED'",
  "set search_path = ''",
]) {
  if (!phase153cMigration.includes(fragment)) fail('Phase 15.3C migration missing invariant: ' + fragment);
}
if (/\b(?:delete\s+from|insert\s+into|update)\s+storage\.(?:objects|buckets)\b/i.test(phase153cMigration)) {
  fail('Phase 15.3C must use the Storage API instead of mutating Storage metadata with SQL');
}
for (const signature of [
  'public.cancel_own_platform_account_deletion(uuid, text)',
  'public.prepare_platform_account_deletion(uuid, uuid, text, text)',
  'public.mark_platform_account_deletion_storage_cleared(uuid, uuid, bigint)',
  'public.record_platform_account_deletion_failure(uuid, uuid, bigint, text)',
]) {
  if (!phase153cMigration.includes('grant execute on function ' + signature + ' to service_role')) {
    fail('Phase 15.3C missing service-role-only deletion grant: ' + signature);
  }
}
if (/grant\s+execute\s+on\s+function\s+public\.(?:cancel_own|prepare|mark|record)_platform_account_deletion[^;]*\bto\s+authenticated/i.test(phase153cMigration)) {
  fail('Phase 15.3C irreversible coordination RPCs must never be executable by the browser role');
}

const phase153cTest = fs.readFileSync(phase153cTestPath, 'utf8');
const phase153cPlan = Number((phase153cTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase153cAssertions = (phase153cTest.match(
  /select\s+(?:has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase153cPlan !== phase153cAssertions) {
  fail('Phase 15.3C pgTAP plan ' + phase153cPlan + ' must match ' + phase153cAssertions + ' assertions');
}
if (phase153cPlan < 60) fail('Phase 15.3C deletion suite must retain comprehensive coverage');
for (const coverage of [
  'administrator cannot request deletion while the target owns a group',
  'hard Auth deletion is blocked before Storage cleanup completes',
  'direct profile deletion remains blocked even after Storage cleanup',
  'authoritative scoring history follows the documented profile cascade',
  'append-only deletion audit survives profile/Auth deletion',
  'self-service exact confirmation prepares the same deletion engine',
  'self-cancellation restores a clean ACTIVE account',
  'direct hard Auth deletion cannot bypass pending-state and preparation checks',
]) {
  if (!phase153cTest.includes(coverage)) fail('Phase 15.3C pgTAP missing coverage: ' + coverage);
}

const phase153cFunction = read('supabase/functions/platform-account-auth/index.ts');
for (const fragment of [
  "action === 'DELETE_ADMIN'",
  "action === 'DELETE_SELF'",
  "action === 'CANCEL_DELETE_SELF'",
  "rpc('prepare_platform_account_deletion'",
  "rpc('mark_platform_account_deletion_storage_cleared'",
  "rpc('record_platform_account_deletion_failure'",
  "storage.from(PROFILE_PICTURE_BUCKET)",
  'storage.remove(batch)',
  'auth.admin.deleteUser(targetUserId, false)',
  'STORAGE_CLEANUP_FAILED',
  'AUTH_ADMIN_DELETE_FAILED',
]) {
  if (!phase153cFunction.includes(fragment)) fail('Phase 15.3C Edge Function missing invariant: ' + fragment);
}
if (/VITE_|serviceRoleKey.*jsonResponse|SUPABASE_SERVICE_ROLE_KEY.*body/i.test(phase153cFunction)) {
  fail('Phase 15.3C Edge Function must never expose the service-role credential');
}

const selfDeletionService = read('src/features/settings/accountDeletionService.ts');
for (const fragment of [
  "rpc('request_own_platform_account_deletion')",
  "action: 'CANCEL_DELETE_SELF'",
  "action: 'DELETE_SELF'",
]) {
  if (!selfDeletionService.includes(fragment)) fail('Phase 15.3C self-deletion service missing boundary: ' + fragment);
}
for (const fragment of [
  "action: 'DELETE_ADMIN'",
  'confirmDeletion(userId: string, confirmation: string)',
]) {
  if (!phase153aService.includes(fragment)) fail('Phase 15.3C admin deletion service missing boundary: ' + fragment);
}

// Phase 15.3D approved user-administration UI.
for (const relativePath of [
  'PHASE15.3D-PATCH-MANIFEST.txt',
  'src/features/admin/accounts/accountAdministrationValidation.ts',
  'src/features/admin/accounts/hooks/useUserAdministration.ts',
  'user-administration.e2e.html',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3D file missing: ' + relativePath);
}
const phase153dHook = read('src/features/admin/accounts/hooks/useUserAdministration.ts');
const phase153dValidation = read('src/features/admin/accounts/accountAdministrationValidation.ts');
for (const protection of ['directoryRequestRef', 'detailRequestRef', 'actionBusyRef']) {
  if (!phase153dHook.includes(protection)) fail('Phase 15.3D async coordination missing protection: ' + protection);
}

// Phase 15.3E private reports + moderation-case foundation.
for (const relativePath of [
  'PHASE15.3E-PATCH-MANIFEST.txt',
  'supabase/migrations/20260823140206_user_reports_moderation_foundation.sql',
  'supabase/tests/033_user_reports_moderation_foundation.test.sql',
  'src/features/moderation/model.ts',
  'src/features/moderation/userReportService.ts',
  'src/features/admin/moderation/model.ts',
  'src/features/admin/moderation/moderationCaseService.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3E file missing: ' + relativePath);
}

const phase153eMigration = read('supabase/migrations/20260823140206_user_reports_moderation_foundation.sql');
const phase153eTest = read('supabase/tests/033_user_reports_moderation_foundation.test.sql');
const phase153eUserService = read('src/features/moderation/userReportService.ts');
const phase153eAdminService = read('src/features/admin/moderation/moderationCaseService.ts');

for (const fragment of [
  'create table private.user_reports',
  'create table private.moderation_cases',
  'create table private.moderation_case_notes',
  'create table private.moderation_case_events',
  'function public.submit_user_report',
  'function public.list_moderation_cases',
  'function public.get_moderation_case_detail',
  'function public.assign_moderation_case',
  'function public.add_moderation_case_note',
  'function public.update_moderation_case_status',
  'private.require_active_account()',
  'private.require_active_platform_admin()',
  'Users cannot report themselves',
  'Report submission limit reached; try again later',
  'This incident was already reported recently',
  "interval '2 years'",
  'Moderation evidence and history are immutable',
  "set search_path = ''",
]) {
  if (!phase153eMigration.includes(fragment)) fail('Phase 15.3E migration missing invariant: ' + fragment);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase153eMigration)) {
  fail('Phase 15.3E must not grant browser roles direct access to private moderation objects');
}
if (/['"]MESSAGE['"]/.test(
  phase153eMigration.match(/create type public\.user_report_reference_type[\s\S]*?\);/)?.[0] || '',
)) {
  fail('Phase 15.3E must not invent message evidence before a durable message source exists');
}

const phase153ePlan = Number((phase153eTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase153eAssertions = (phase153eTest.match(
  /select\s+(?:has_type|has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase153ePlan !== phase153eAssertions) {
  fail('Phase 15.3E pgTAP plan ' + phase153ePlan + ' must match ' + phase153eAssertions + ' assertions');
}
if (phase153ePlan < 80) fail('Phase 15.3E privacy/moderation suite must retain comprehensive coverage');
for (const coverage of [
  'users cannot report themselves',
  'reported users cannot read case detail or reporter identity',
  'normalized duplicate incidents are rejected for 24 hours',
  'a reporter is limited to ten submissions in a rolling 24-hour window',
  'closed cases retain report, evidence, notes, and history for at least two years',
  'submission, assignment, note, review, and resolution remain in append-only history',
]) {
  if (!phase153eTest.includes(coverage)) fail('Phase 15.3E pgTAP missing coverage: ' + coverage);
}

for (const rpc of ['submit_user_report']) {
  if (!phase153eUserService.includes(rpc)) fail('Phase 15.3E user report service missing RPC: ' + rpc);
}
for (const rpc of [
  'list_moderation_cases',
  'get_moderation_case_detail',
  'list_moderation_case_notes',
  'list_moderation_case_events',
  'assign_moderation_case',
  'add_moderation_case_note',
  'update_moderation_case_status',
]) {
  if (!phase153eAdminService.includes(rpc)) fail('Phase 15.3E moderator service missing RPC: ' + rpc);
}
if (/service[_-]?role|SUPABASE_SECRET|from\(['"](?:user_reports|moderation_cases|moderation_case_notes|moderation_case_events)/i.test(
  phase153eUserService + phase153eAdminService,
)) {
  fail('Phase 15.3E browser services must not contain privileged credentials or direct private-table access');
}

// Phase 15.3F privacy-bounded activity review + reporting/moderation UI.
for (const relativePath of [
  'PHASE15.3F-PATCH-MANIFEST.txt',
  'supabase/migrations/20260823144115_moderation_activity_review.sql',
  'supabase/tests/034_moderation_activity_review.test.sql',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.3F file missing: ' + relativePath);
}

const phase153fMigration = read('supabase/migrations/20260823144115_moderation_activity_review.sql');
const phase153fTest = read('supabase/tests/034_moderation_activity_review.test.sql');
const phase153fAdminService = read('src/features/admin/moderation/moderationCaseService.ts');

for (const fragment of [
  'create type public.moderation_activity_type',
  'create table private.moderation_access_log',
  'function private.resolve_moderation_subject',
  'function private.append_moderation_access',
  'function public.begin_moderation_activity_review',
  'function public.list_moderation_activity_review',
  'private.require_active_platform_admin()',
  "access_kind in ('CASE_DETAIL', 'ACTIVITY_TIMELINE')",
  "interval '15 minutes'",
  "interval '2 years'",
  'private.reject_moderation_immutable_mutation()',
  "set search_path = ''",
]) {
  if (!phase153fMigration.includes(fragment)) fail('Phase 15.3F migration missing invariant: ' + fragment);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase153fMigration)) {
  fail('Phase 15.3F must not grant browser roles direct access to private moderation objects');
}
if (/['"]COMMUNICATION['"]/.test(
  phase153fMigration.match(/create type public\.moderation_activity_type[\s\S]*?\);/)?.[0] || '',
)) {
  fail('Phase 15.3F must not fabricate communication activity before Phase 15.4');
}
const phase153fPlan = Number((phase153fTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase153fAssertions = (phase153fTest.match(
  /select\s+(?:has_type|has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase153fPlan !== phase153fAssertions) {
  fail('Phase 15.3F pgTAP plan ' + phase153fPlan + ' must match ' + phase153fAssertions + ' assertions');
}
if (phase153fPlan < 40) fail('Phase 15.3F sensitive-activity suite must retain comprehensive coverage');
for (const coverage of [
  'ordinary users cannot begin sensitive activity review',
  'review grants are bound to the moderator who declared the purpose',
  'activity source selection is enforced server-side',
  'workout notes are redacted from moderation review',
  'sensitive access audit is append-only',
  'identity snapshots preserve deletion-safe retained review context',
]) {
  if (!phase153fTest.includes(coverage)) fail('Phase 15.3F pgTAP missing coverage: ' + coverage);
}
for (const rpc of ['begin_moderation_activity_review', 'list_moderation_activity_review']) {
  if (!phase153fAdminService.includes(rpc)) fail('Phase 15.3F moderator service missing RPC: ' + rpc);
}

// Phase 15.4 auditable administrator-to-user messaging.
for (const relativePath of [
  'PHASE15.4-PATCH-MANIFEST.txt',
  'supabase/migrations/20260823150601_platform_admin_messaging.sql',
  'supabase/migrations/20260823151630_platform_admin_messaging_contracts.sql',
  'supabase/tests/035_platform_admin_messaging.test.sql',
  'src/features/admin/messaging/platformMessagingService.ts',
  'src/features/messaging/platformMessageService.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.4 file missing: ' + relativePath);
}
const phase154EnumMigration = read('supabase/migrations/20260823150601_platform_admin_messaging.sql');
const phase154Migration = read('supabase/migrations/20260823151630_platform_admin_messaging_contracts.sql');
const phase154Test = read('supabase/tests/035_platform_admin_messaging.test.sql');
const phase154AdminService = read('src/features/admin/messaging/platformMessagingService.ts');
const phase154UserService = read('src/features/messaging/platformMessageService.ts');
if (!phase154EnumMigration.includes("alter type public.moderation_activity_type add value if not exists 'COMMUNICATION'")) {
  fail('Phase 15.4 communication enum value must be committed before its durable source is referenced');
}
for (const fragment of [
  'create table private.platform_messages',
  'create table private.platform_message_revisions',
  'create table private.platform_message_deliveries',
  'create table private.platform_message_events',
  'function private.resolve_platform_message_recipients',
  'function public.preview_platform_message_audience',
  'function public.send_platform_message',
  'function public.list_my_platform_messages',
  'Full-platform blasts must be dismissible notices',
  'Full-platform blasts are dismissible and cannot require acknowledgement',
  "interval '2 years'",
  "set search_path = ''",
]) {
  if (!phase154Migration.includes(fragment)) fail('Phase 15.4 migration missing invariant: ' + fragment);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(phase154Migration)) {
  fail('Phase 15.4 must not grant browser roles direct access to private messaging objects');
}
const phase154Plan = Number((phase154Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase154Assertions = (phase154Test.match(
  /select\s+(?:has_type|has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase154Plan !== 96 || phase154Plan !== phase154Assertions) {
  fail('Phase 15.4 pgTAP plan must match its 96 assertions');
}
for (const coverage of [
  'retrying a completed preview returns the original message idempotently',
  'recipient must read and acknowledge a newly edited revision again',
  'full-platform what-is-new popup cannot demand acknowledgement',
  'dismissed full-platform blast will not reopen on the next inbox load',
  'administrator messaging does not create or alter XP events',
]) {
  if (!phase154Test.includes(coverage)) fail('Phase 15.4 pgTAP missing coverage: ' + coverage);
}
for (const rpc of ['search_platform_message_users', 'search_platform_message_groups', 'preview_platform_message_audience', 'send_platform_message', 'list_platform_messages']) {
  if (!phase154AdminService.includes(rpc)) fail('Phase 15.4 administrator service missing RPC: ' + rpc);
}
for (const rpc of ['list_my_platform_messages', 'mark_platform_message_read', 'acknowledge_platform_message']) {
  if (!phase154UserService.includes(rpc)) fail('Phase 15.4 user service missing RPC: ' + rpc);
}

// Phase 15.5 integrated administration and deny-by-default function security.
for (const relativePath of [
  'PHASE15.5-PATCH-MANIFEST.txt',
  'supabase/migrations/20260823160157_phase15_5_admin_security_gate.sql',
  'supabase/tests/036_admin_integration_security_gate.test.sql',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.5 file missing: ' + relativePath);
}
const phase155Migration = read('supabase/migrations/20260823160157_phase15_5_admin_security_gate.sql');
const phase155Test = read('supabase/tests/036_admin_integration_security_gate.test.sql');
for (const fragment of [
  'alter default privileges for role postgres in schema public',
  'revoke execute on functions from public, anon, authenticated',
  'revoke execute on all functions in schema public from public, anon',
  "pg_get_function_result(p.oid) = 'trigger'",
  'deny-by-default',
]) {
  if (!phase155Migration.includes(fragment)) fail('Phase 15.5 function hardening missing invariant: ' + fragment);
}
const phase155Plan = Number((phase155Test.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase155Assertions = (phase155Test.match(
  /select\s+(?:has_type|has_table|has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase155Plan !== 27 || phase155Plan !== phase155Assertions) {
  fail(`Phase 15.5 pgTAP plan ${phase155Plan} must match its ${phase155Assertions} assertions`);
}
for (const coverage of [
  'anonymous callers cannot execute any existing public function',
  'group ownership does not grant platform administration',
  'global Data API pre-request guard blocks a suspended account across every feature RPC',
]) {
  if (!phase155Test.includes(coverage)) fail('Phase 15.5 pgTAP missing coverage: ' + coverage);
}

// Phase 15.6A ordinary Profile/Settings foundation.
for (const relativePath of [
  'PHASE15.6A-PATCH-MANIFEST.txt',
  'supabase/migrations/20260823162857_phase15_6a_profile_settings_foundation.sql',
  'supabase/tests/037_phase15_6a_profile_settings_foundation.test.sql',
  'src/features/settings/settingsService.ts',
  'src/features/settings/accountSecurityService.ts',
  'src/features/settings/hooks/useProfileSettings.ts',
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail('Phase 15.6A file missing: ' + relativePath);
}
const phase156aMigration = read('supabase/migrations/20260823162857_phase15_6a_profile_settings_foundation.sql');
const phase156aTest = read('supabase/tests/037_phase15_6a_profile_settings_foundation.test.sql');
const phase156aService = read('src/features/settings/settingsService.ts');
for (const fragment of [
  'preferred_weight_unit',
  'public.update_my_profile_settings',
  'private.require_active_account()',
  "set search_path = ''",
  'revoke update (username, display_name, timezone)',
  'pending_weekly_workout_target_week_start',
]) {
  if (!phase156aMigration.includes(fragment)) fail('Phase 15.6A migration missing invariant: ' + fragment);
}
const phase156aPlan = Number((phase156aTest.match(/select\s+plan\((\d+)\)/i) || [])[1]);
const phase156aAssertions = (phase156aTest.match(
  /select\s+(?:has_column|has_function|is|results_eq|throws_ok|lives_ok)\s*\(/gi,
) || []).length;
if (phase156aPlan !== 31 || phase156aPlan !== phase156aAssertions) {
  fail(`Phase 15.6A pgTAP plan ${phase156aPlan} must match its ${phase156aAssertions} assertions`);
}
for (const fragment of [
  "rpc('update_my_profile_settings'",
  'p_preferred_weight_unit',
  'assertValidOnboardingInput',
]) {
  if (!phase156aService.includes(fragment)) fail('Phase 15.6A settings service missing boundary: ' + fragment);
}

const ciWorkflow = read('.github/workflows/ci.yml');
const supabaseConfig = read('supabase/config.toml');
const hostedAggregateSentinel = read('supabase/tests/_all-hosted-tests.sql');
const currentPackageJson = JSON.parse(read('package.json'));
if (currentPackageJson.scripts?.['db:test']) {
  fail('ambiguous db:test script must stay removed; the supported repository gate is db:test:ci');
}
if (!String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-db-ci.cjs')
    || !String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-phase15-6b.cjs')
    || !String(currentPackageJson.scripts?.['db:test:ci'] || '').includes('validate-phase15-6c.cjs')) {
  fail('db:test:ci must retain the current static database contract validators');
}

const executableCiWorkflow = ciWorkflow
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');

if (!/^\s*pull_request\s*:/m.test(ciWorkflow)) {
  fail('GitHub CI must retain the pull_request trigger');
}
if (!/^\s*workflow_dispatch\s*:/m.test(ciWorkflow)) {
  fail('GitHub CI must retain manual workflow_dispatch');
}
if (/^\s*push\s*:/m.test(ciWorkflow)) {
  fail('GitHub CI must not run automatically on push under the lightweight CI policy');
}
if (!/pull_request\s*:[\s\S]{0,240}?branches\s*:[\s\S]{0,100}?-\s*master\b/m.test(ciWorkflow)) {
  fail('GitHub CI pull requests must target master');
}
for (const ignoredPath of ["'docs/**'", "'**/*.md'"]) {
  if (!ciWorkflow.includes(ignoredPath)) {
    fail('GitHub CI must ignore documentation-only pull requests: ' + ignoredPath);
  }
}
if (!/permissions\s*:[\s\S]{0,80}?contents\s*:\s*read\b/m.test(ciWorkflow)) {
  fail('GitHub CI must retain read-only contents permission');
}
if (!/cancel-in-progress\s*:\s*true\b/.test(ciWorkflow)) {
  fail('GitHub CI must cancel superseded runs');
}
for (const command of ['npm ci', 'npm run build']) {
  if (!executableCiWorkflow.includes(command)) {
    fail('GitHub CI build-sanity workflow missing required command: ' + command);
  }
}
for (const heavyweightCommand of [
  'npm run typecheck',
  'npm test',
  'npm run test:integration',
  'npm run test:structure',
  'npm run test:internal',
  'npx playwright install',
  'npm run test:e2e',
  'npm run db:test:ci',
]) {
  if (executableCiWorkflow.includes(heavyweightCommand)) {
    fail('GitHub CI must keep heavyweight release validation local/hosted: ' + heavyweightCommand);
  }
}
for (const staleCommand of [
  'npx supabase start',
  'npx supabase db reset',
  'npm run db:test:local',
  'npx supabase db lint --level warning',
]) {
  if (executableCiWorkflow.includes(staleCommand)) {
    fail('GitHub CI must not retain stale local-Supabase command text: ' + staleCommand);
  }
}
if (!/node-version:\s*24/.test(ciWorkflow)) {
  fail('GitHub CI must match the Node 24 release environment');
}

if (!/project_id\s*=\s*"fitness-game-pwa"/.test(supabaseConfig)
    || !/major_version\s*=\s*17/.test(supabaseConfig)
    || !/site_url\s*=\s*"http:\/\/localhost:5173"/.test(supabaseConfig)) {
  fail('committed Supabase CLI config must remain non-secret, Postgres-17 aligned, and Vite-auth compatible');
}
const sentinelPlans = (hostedAggregateSentinel.match(/select\s+plan\(/gi) || []).length;
if (sentinelPlans !== 1 || /-- ={10,}\s*\n-- 00\d_/m.test(hostedAggregateSentinel)) {
  fail('_all-hosted-tests.sql must remain a one-plan compatibility sentinel, never a concatenated pgTAP bundle');
}

// Baseline structural validation is current and runs directly without synthetic files or metadata.
require('./validate-project.cjs');

console.log('Release validation passed: clean migration history, current PWA/cache state, Phase 15 admin/capacity/account/messaging/security invariants, completed Phase 15.6 Settings/notification contracts, Docker-free GitHub CI/database discovery, the Phase 16 handoff, and production chunk-budget guards are present.');
