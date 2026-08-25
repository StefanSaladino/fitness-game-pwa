const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = 'supabase/migrations/20260823175728_phase15_6b_notification_preferences.sql';
const testPath = 'supabase/tests/038_phase15_6b_notification_preferences.test.sql';
const servicePath = 'src/features/settings/notificationPreferenceService.ts';

function fail(message) {
  throw new Error(`Phase 15.6B contract gate failed: ${message}`);
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) fail(`required file missing: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

const migration = read(migrationPath);
for (const invariant of [
  'create table public.notification_preferences',
  'notifications_enabled boolean not null default false',
  'workout_reminders boolean not null default false',
  'weekly_goal_reminders boolean not null default false',
  'badge_achievements boolean not null default false',
  'personal_record_alerts boolean not null default false',
  'group_activity boolean not null default false',
  'group_invitations boolean not null default false',
  'alter table public.notification_preferences enable row level security',
  'grant select on table public.notification_preferences to authenticated',
  'profiles_create_notification_preferences',
  'public.update_my_notification_preferences',
  'private.require_active_account()',
  "set search_path = ''",
  'Master OFF preserves category selections',
]) {
  if (!migration.includes(invariant)) fail(`migration missing invariant: ${invariant}`);
}

if (!/revoke all on table public\.notification_preferences from public, anon, authenticated/i.test(migration)) {
  fail('direct table mutation/read grants must begin deny-by-default');
}
if (!/revoke all on function public\.update_my_notification_preferences\([\s\S]*?from public, anon, authenticated;/i.test(migration)) {
  fail('notification RPC must revoke implicit execution before the authenticated grant');
}
if (!/grant execute on function public\.update_my_notification_preferences\([\s\S]*?to authenticated;/i.test(migration)) {
  fail('notification RPC must explicitly grant only the authenticated role');
}

const test = read(testPath);
if (!/select\s+plan\s*\(\s*37\s*\)\s*;/i.test(test)) {
  fail('pgTAP suite must retain its 37-assertion plan');
}
for (const coverage of [
  'all optional notification preferences default off',
  'RLS exposes only the current user notification preference row',
  'RLS hides another user notification preference row',
  'master OFF preserves individual category selections',
  'master ON restores the previously preserved category selections',
  'suspended users cannot update notification preferences',
  'notification preference updates do not create scoring events',
  'notification preference updates do not award badges',
]) {
  if (!test.includes(coverage)) fail(`pgTAP suite missing coverage: ${coverage}`);
}

const service = read(servicePath);
for (const invariant of [
  "from('notification_preferences')",
  "rpc('update_my_notification_preferences'",
  'Notification preferences returned an invalid response.',
]) {
  if (!service.includes(invariant)) fail(`service missing boundary: ${invariant}`);
}
if (/localStorage|Notification\.requestPermission|PushManager|serviceWorker\.pushManager/.test(service)) {
  fail('15.6B service must not implement device permission or push-subscription behavior');
}

console.log('Phase 15.6B contract gate passed: notification persistence is server-owned, self-scoped, default-off, and delivery-independent.');
