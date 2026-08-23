const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = 'supabase/migrations/20260823182658_phase15_6c_pwa_push_delivery.sql';
const repairPath = 'supabase/migrations/20260823182930_phase15_6c_fix_push_target_conflict.sql';
const reconciliationPath = 'supabase/migrations/20260823191313_phase15_6c_reconcile_pg_net_extension.sql';
const indexPath = 'supabase/migrations/20260823191540_phase15_6c_push_foreign_key_indexes.sql';
const testPath = 'supabase/tests/039_phase15_6c_pwa_push_delivery.test.sql';
const reconciliationTestPath = 'supabase/tests/040_phase15_6c_pg_net_reconciliation.test.sql';
const edgePath = 'supabase/functions/push-notifications/index.ts';
const pushServicePath = 'src/pwa/pushNotificationService.ts';
const pushServiceTestPath = 'src/pwa/pushNotificationService.test.ts';
const sectionPath = 'src/features/settings/NotificationSettingsSection.tsx';
const sectionTestPath = 'src/features/settings/NotificationSettingsSection.test.tsx';
const hookPath = 'src/features/settings/hooks/useNotificationSettings.ts';
const serviceWorkerPath = 'public/sw.js';
const configPath = 'supabase/config.toml';
const phaseDocPath = 'docs/PHASE15.6C-PWA-PUSH-DELIVERY.md';
const reconciliationDocPath = 'docs/PHASE15.6C-PG-NET-RECONCILIATION.md';
const manifestPath = 'PHASE15.6C-PATCH-MANIFEST.txt';

function fail(message) {
  throw new Error(`Phase 15.6C contract gate failed: ${message}`);
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) fail(`required file missing: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

const migration = read(migrationPath);
for (const invariant of [
  'create table private.push_runtime_config',
  'create table private.push_subscriptions',
  'create table private.push_delivery_queue',
  'create table private.push_delivery_targets',
  'public.register_my_push_subscription',
  'public.revoke_my_push_subscription',
  'public.get_my_push_device_summary',
  'public.enqueue_my_push_test',
  'public.prepare_push_delivery',
  'public.record_push_delivery_result',
  'private.dispatch_push_delivery',
  'private.dispatch_pending_push_deliveries',
  "'fitness-push-delivery'",
  'user_badges_enqueue_push',
  'scoring_events_enqueue_personal_record_push',
  'group_invites_enqueue_push',
  'private.require_active_account()',
  "'BADGE_ACHIEVEMENTS'",
  "'PERSONAL_RECORD_ALERTS'",
  "'GROUP_INVITATIONS'",
  "set search_path = ''",
]) {
  if (!migration.includes(invariant)) fail(`primary migration missing invariant: ${invariant}`);
}
if (!/revoke all on table private\.push_subscriptions from public, anon, authenticated/i.test(migration)) {
  fail('subscription capability data must remain private from browser roles');
}
if (!/grant execute on function public\.register_my_push_subscription[\s\S]*?to authenticated;/i.test(migration)) {
  fail('device registration must be explicitly authenticated-only');
}
if (!/grant execute on function public\.prepare_push_delivery\(uuid\)[\s\S]*?to service_role;/i.test(migration)) {
  fail('delivery preparation must remain service-role-only');
}

const repair = read(repairPath);
if (!repair.includes('on conflict on constraint push_delivery_targets_pkey do nothing')) {
  fail('immutable repair migration must resolve the hosted queue_id conflict via named primary-key constraint');
}
if (!repair.includes('create or replace function public.prepare_push_delivery')) {
  fail('repair migration must remain narrowly scoped to delivery preparation');
}

const reconciliation = read(reconciliationPath);
for (const invariant of [
  'lock table net.http_request_queue in access exclusive mode',
  'pg_net request queue must be empty before extension reconciliation',
  'drop extension pg_net',
  'create extension pg_net with schema extensions',
  "v_extension_schema is distinct from 'extensions'",
  "has_schema_privilege('anon', 'private', 'USAGE')",
  "has_schema_privilege('authenticated', 'private', 'USAGE')",
  "private.dispatch_push_delivery(uuid)",
  "jobname = 'fitness-push-delivery'",
  "command = 'select private.dispatch_pending_push_deliveries();'",
]) {
  if (!reconciliation.includes(invariant)) fail(`pg_net reconciliation migration missing invariant: ${invariant}`);
}
if (/drop extension pg_net\s+cascade/i.test(reconciliation)) {
  fail('pg_net reconciliation must never use CASCADE');
}

const indexMigration = read(indexPath);
for (const invariant of [
  'create index push_delivery_queue_target_subscription_idx',
  'on private.push_delivery_queue (target_subscription_id)',
  'create index push_delivery_targets_subscription_idx',
  'on private.push_delivery_targets (subscription_id)',
]) {
  if (!indexMigration.includes(invariant)) fail(`push foreign-key index migration missing: ${invariant}`);
}

const test = read(testPath);
if (!/select\s+plan\s*\(\s*79\s*\)\s*;/i.test(test)) {
  fail('pgTAP suite must retain its hosted-verified 79-assertion plan');
}
for (const coverage of [
  'multiple authorized devices are retained independently',
  'shared-browser endpoint ownership moves to the current authenticated account',
  'suspended users cannot register push subscriptions',
  'default-off accounts do not enqueue optional badge push',
  'authoritative exercise-progression event enqueues one personal-record push',
  'group invitation enqueues one privacy-bounded invitation push',
  'delivery preparation suppresses queued optional push after master preference turns off',
  'one optional event prepares one delivery target per active account device',
  'provider-expired endpoint is revoked for future deliveries',
  'transient provider failure keeps queue retryable',
  'delivery suppression never clears persisted category selections',
]) {
  if (!test.includes(coverage)) fail(`pgTAP suite missing coverage: ${coverage}`);
}

const reconciliationTest = read(reconciliationTestPath);
if (!/select\s+plan\s*\(\s*14\s*\)\s*;/i.test(reconciliationTest)) {
  fail('pg_net reconciliation pgTAP suite must retain its hosted-verified 14-assertion plan');
}
for (const coverage of [
  'pg_net extension is registered outside public',
  'private push dispatcher remains security definer',
  'anonymous browser role cannot use private schema',
  'authenticated browser role cannot use private schema',
  'authenticated browser role cannot execute private push dispatcher',
  'hosted push retry cron remains active and exact',
  'private dispatcher can still invoke recreated pg_net API',
]) {
  if (!reconciliationTest.includes(coverage)) fail(`pg_net reconciliation suite missing coverage: ${coverage}`);
}

const edge = read(edgePath);
for (const invariant of [
  "npm:web-push@3.6.7",
  "auth.getUser(token)",
  "rpc('get_my_platform_access')",
  "body.action === 'GET_PUBLIC_KEY'",
  "request.headers.get('x-push-dispatch-token')",
  "rpc('prepare_push_delivery'",
  "rpc('record_push_delivery_result'",
  'generateVAPIDKeys()',
  'sendNotification',
]) {
  if (!edge.includes(invariant)) fail(`Edge worker missing boundary: ${invariant}`);
}
if (/VITE_|localStorage|window\.|document\./.test(edge)) {
  fail('server push worker must not depend on browser/Vite state');
}
if (/dispatchToken.*jsonResponse|privateKey.*jsonResponse/.test(edge)) {
  fail('server push secrets must never be returned to browser callers');
}

const pushService = read(pushServicePath);
for (const invariant of [
  'Notification.requestPermission()',
  "functions.invoke('push-notifications'",
  "rpc('register_my_push_subscription'",
  "rpc('revoke_my_push_subscription'",
  "rpc('enqueue_my_push_test'",
  'userVisibleOnly: true',
  "capability: 'requires-install'",
]) {
  if (!pushService.includes(invariant)) fail(`push device service missing behavior: ${invariant}`);
}
if (/update_my_notification_preferences/.test(pushService)) {
  fail('device permission/subscription logic must never rewrite account-level notification preferences');
}
const inspectBody = pushService.match(/async function inspect\(\)[\s\S]*?\n  }\n\n  return \{/i)?.[0] || '';
if (inspectBody.includes('Notification.requestPermission')) {
  fail('Settings/device inspection must never auto-prompt for permission');
}

const pushServiceTest = read(pushServiceTestPath);
for (const coverage of [
  'inspects default permission without prompting on Settings load',
  'requests permission only from enable',
  'keeps account preferences separate when browser permission is denied',
  'requires iOS/iPadOS browser sessions to become a Home Screen app',
]) {
  if (!pushServiceTest.includes(coverage)) fail(`push service tests missing: ${coverage}`);
}

const hook = read(hookPath);
if (/supabase|\.rpc\(|functions\.invoke/i.test(hook)) {
  fail('notification Settings hook must orchestrate services rather than talk to Supabase directly');
}
for (const category of ['badgeAchievements', 'personalRecordAlerts', 'groupInvitations']) {
  if (!hook.includes(category)) fail(`notification Settings hook missing supported category: ${category}`);
}

const section = read(sectionPath);
for (const label of [
  'Optional notifications',
  'Badges & achievements',
  'Personal records',
  'Group invitations',
  'Workout reminders',
  'Weekly goal reminders',
  'Group activity',
  'Not available yet',
  'Enable on this device',
  'Disable on this device',
  'Send test notification',
]) {
  if (!section.includes(label)) fail(`notification Settings UI missing honest state/control: ${label}`);
}
for (const unsupported of ['Workout reminders', 'Weekly goal reminders', 'Group activity']) {
  const rowStart = section.indexOf(`['${unsupported}'`);
  if (rowStart < 0) fail(`unsupported category declaration missing: ${unsupported}`);
}
if (/from\s+['"][^'"]*supabase|\.rpc\(|functions\.invoke/.test(section)) {
  fail('notification Settings presentation must remain behind services/hooks');
}

const sectionTest = read(sectionTestPath);
for (const coverage of [
  'exposes switches only for categories with real Phase 15.6C delivery behavior',
  'keeps child selections visible but disabled while the master preference is off',
  'uses an explicit device action for the permission request path',
]) {
  if (!sectionTest.includes(coverage)) fail(`notification Settings tests missing: ${coverage}`);
}

const sw = read(serviceWorkerPath);
for (const invariant of [
  "const CACHE_VERSION = 'v13-2'",
  "self.addEventListener('push'",
  'showNotification',
  "self.addEventListener('notificationclick'",
  'sameOriginPath',
  'openWindow',
]) {
  if (!sw.includes(invariant)) fail(`service worker missing push safety behavior: ${invariant}`);
}

const config = read(configPath);
if (!/\[functions\.push-notifications\][\s\S]*?verify_jwt\s*=\s*false/.test(config)) {
  fail('push Edge Function config must document manual dual authorization for background dispatch');
}
if (!/server-only random[\s\S]*dispatch credential|server-only.*dispatch credential/i.test(config)) {
  fail('verify_jwt=false exception must document its server-only dispatch boundary');
}

const phaseDoc = read(phaseDocPath);
for (const statement of [
  'Status: **DONE**',
  '20260823182658_phase15_6c_pwa_push_delivery',
  '20260823182930_phase15_6c_fix_push_target_conflict',
  '79/79 passed',
  'HTTP 200',
  'workout reminders',
  'weekly goal reminders',
  'group activity',
  'no-Docker',
]) {
  if (!phaseDoc.toLowerCase().includes(statement.toLowerCase())) fail(`phase documentation missing: ${statement}`);
}

const reconciliationDoc = read(reconciliationDocPath);
for (const statement of [
  '20260823191313_phase15_6c_reconcile_pg_net_extension',
  '20260823191540_phase15_6c_push_foreign_key_indexes',
  '14/14',
  'extension_in_public_pg_net',
  'Supabase-managed',
  'HTTP 200',
]) {
  if (!reconciliationDoc.includes(statement)) fail(`pg_net reconciliation documentation missing: ${statement}`);
}

read(manifestPath);
console.log('Phase 15.6C contract gate passed: permission is explicit, push delivery is durable and device-scoped, pg_net is reconciled outside public, unsupported categories stay honest, and server credentials remain private.');
