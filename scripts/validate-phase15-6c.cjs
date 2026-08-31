const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = 'supabase/migrations/20260823182658_phase15_6c_pwa_push_delivery.sql';
const repairPath = 'supabase/migrations/20260823182930_phase15_6c_fix_push_target_conflict.sql';
const reconciliationPath = 'supabase/migrations/20260823191313_phase15_6c_reconcile_pg_net_extension.sql';
const indexPath = 'supabase/migrations/20260823191540_phase15_6c_push_foreign_key_indexes.sql';
const edgePath = 'supabase/functions/push-notifications/index.ts';
const pushServicePath = 'src/pwa/pushNotificationService.ts';
const hookPath = 'src/features/settings/hooks/useNotificationSettings.ts';
const serviceWorkerPath = 'public/sw.js';
const configPath = 'supabase/config.toml';
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
  "export type PushDeviceCapability = 'available' | 'requires-install' | 'unsupported'",
  'if (isIosLike() && !isStandalone()) return \'requires-install\';',
  'Notification.requestPermission()',
  "functions.invoke('push-notifications'",
  "rpc('register_my_push_subscription'",
  "rpc('revoke_my_push_subscription'",
  "rpc('enqueue_my_push_test'",
  'userVisibleOnly: true',
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

const hook = read(hookPath);
if (/supabase|\.rpc\(|functions\.invoke/i.test(hook)) {
  fail('notification Settings hook must orchestrate services rather than talk to Supabase directly');
}
for (const category of ['badgeAchievements', 'personalRecordAlerts', 'groupInvitations']) {
  if (!hook.includes(category)) fail(`notification Settings hook missing supported category: ${category}`);
}

const sw = read(serviceWorkerPath);
for (const invariant of [
  'const CACHE_VERSION =',
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

read(manifestPath);
console.log('Phase 15.6C contract gate passed: permission is explicit, push delivery is durable and device-scoped, pg_net is reconciled outside public, unsupported categories stay honest, and server credentials remain private.');
