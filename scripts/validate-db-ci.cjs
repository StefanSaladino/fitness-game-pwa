const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const testsDir = path.join(root, 'supabase', 'tests');

function fail(message) {
  throw new Error(`Database contract gate failed: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function listSql(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
}

const migrations = listSql(migrationsDir);
const tests = listSql(testsDir).filter((name) => name.endsWith('.test.sql'));

if (migrations.length === 0) fail('no SQL migrations found');
if (tests.length === 0) fail('no canonical *.test.sql pgTAP suites found');

const migrationPattern = /^(\d{14})_[a-z0-9_]+\.sql$/;
const migrationTimestamps = new Set();
for (const name of migrations) {
  const match = name.match(migrationPattern);
  if (!match) fail(`migration filename is not canonical: ${name}`);
  if (migrationTimestamps.has(match[1])) fail(`duplicate migration timestamp: ${match[1]}`);
  migrationTimestamps.add(match[1]);
  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
  if (!sql.trim()) fail(`migration is empty: ${name}`);
}

const testNumberPattern = /^(\d{3})_[a-z0-9_]+\.test\.sql$/;
const testNumbers = new Set();
for (const name of tests) {
  const match = name.match(testNumberPattern);
  if (!match) fail(`canonical pgTAP filename is invalid: ${name}`);
  if (testNumbers.has(match[1])) fail(`duplicate canonical pgTAP number: ${match[1]}`);
  testNumbers.add(match[1]);

  const sql = fs.readFileSync(path.join(testsDir, name), 'utf8');
  if (!/^\s*begin\s*;/im.test(sql)) fail(`${name} must open a rollback-safe transaction`);
  if (!/\bselect\s+plan\s*\(\s*\d+\s*\)\s*;/i.test(sql)) fail(`${name} must declare an explicit pgTAP plan`);
  if (!/\brollback\s*;\s*$/i.test(sql.trim())) fail(`${name} must finish with ROLLBACK`);
}

const phase153aMigration = 'supabase/migrations/20260822120300_platform_account_administration_foundation.sql';
const phase153aTest = 'supabase/tests/030_platform_account_administration_foundation.test.sql';
const phase153bMigration = 'supabase/migrations/20260822161454_platform_account_suspension_enforcement.sql';
const phase153bHardeningMigration = 'supabase/migrations/20260822161801_harden_active_account_pre_request.sql';
const phase153bHookSchemaMigration = 'supabase/migrations/20260822162155_move_account_hooks_out_of_data_api.sql';
const phase153bTest = 'supabase/tests/031_platform_account_suspension_enforcement.test.sql';
const phase153cMigration = 'supabase/migrations/20260822172823_platform_account_irreversible_deletion.sql';
const phase153cTest = 'supabase/tests/032_platform_account_irreversible_deletion.test.sql';
const phase153eMigration = 'supabase/migrations/20260823140206_user_reports_moderation_foundation.sql';
const phase153eTest = 'supabase/tests/033_user_reports_moderation_foundation.test.sql';
const phase153fMigration = 'supabase/migrations/20260823144115_moderation_activity_review.sql';
const phase153fTest = 'supabase/tests/034_moderation_activity_review.test.sql';
const phase154EnumMigration = 'supabase/migrations/20260823150601_platform_admin_messaging.sql';
const phase154Migration = 'supabase/migrations/20260823151630_platform_admin_messaging_contracts.sql';
const phase154Test = 'supabase/tests/035_platform_admin_messaging.test.sql';
const phase155Migration = 'supabase/migrations/20260823160157_phase15_5_admin_security_gate.sql';
const phase155Test = 'supabase/tests/036_admin_integration_security_gate.test.sql';
const phase156aMigration = 'supabase/migrations/20260823162857_phase15_6a_profile_settings_foundation.sql';
const phase156aTest = 'supabase/tests/037_phase15_6a_profile_settings_foundation.test.sql';
for (const relativePath of [
  phase153aMigration,
  phase153aTest,
  phase153bMigration,
  phase153bHardeningMigration,
  phase153bHookSchemaMigration,
  phase153bTest,
  phase153cMigration,
  phase153cTest,
  phase153eMigration,
  phase153eTest,
  phase153fMigration,
  phase153fTest,
  phase154EnumMigration,
  phase154Migration,
  phase154Test,
  phase155Migration,
  phase155Test,
  phase156aMigration,
  phase156aTest,
]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Phase 15 database artifact missing: ${relativePath}`);
}

const migration153a = read(phase153aMigration);
for (const invariant of [
  'private.require_active_account()',
  'public.list_platform_accounts',
  'public.get_platform_account_detail',
  'public.suspend_platform_account',
  'public.restore_platform_account',
  'public.request_platform_account_deletion',
  'public.cancel_platform_account_deletion',
]) {
  if (!migration153a.includes(invariant)) fail(`Phase 15.3A migration missing invariant: ${invariant}`);
}

const test153a = read(phase153aTest);
if (!/select\s+plan\s*\(\s*68\s*\)\s*;/i.test(test153a)) {
  fail('Phase 15.3A pgTAP suite must retain its 68-assertion plan');
}

const migration153b = read(phase153bMigration);
for (const invariant of [
  'private.platform_auth_coordination',
  'public.is_current_account_session_active',
  'public.enforce_active_account_request',
  'public.prepare_platform_account_auth_transition',
  'public.complete_platform_account_auth_transition',
  'pgrst.db_pre_request',
  'join auth.sessions',
  'profile_pictures_insert_own',
]) {
  if (!migration153b.includes(invariant)) fail(`Phase 15.3B migration missing invariant: ${invariant}`);
}

const test153b = read(phase153bTest);
if (!/select\s+plan\s*\(\s*52\s*\)\s*;/i.test(test153b)) {
  fail('Phase 15.3B pgTAP suite must retain its 52-assertion plan');
}

const hardening153b = read(phase153bHardeningMigration);
for (const invariant of [
  'security invoker',
  'public.is_current_account_session_active()',
  'Account or session is not active',
  'to authenticator',
]) {
  if (!hardening153b.toLowerCase().includes(invariant.toLowerCase())) {
    fail(`Phase 15.3B pre-request hardening missing invariant: ${invariant}`);
  }
}

const hookSchema153b = read(phase153bHookSchemaMigration);
for (const invariant of [
  'create schema if not exists api_hooks',
  'set schema api_hooks',
  "pgrst.db_pre_request = 'api_hooks.enforce_active_account_request'",
  'grant usage on schema api_hooks',
]) {
  if (!hookSchema153b.includes(invariant)) {
    fail(`Phase 15.3B non-exposed hook schema missing invariant: ${invariant}`);
  }
}

const migration153c = read(phase153cMigration);
for (const invariant of [
  'private.platform_account_deletion_jobs',
  'public.request_own_platform_account_deletion',
  'public.cancel_own_platform_account_deletion',
  'public.prepare_platform_account_deletion',
  'public.mark_platform_account_deletion_storage_cleared',
  'public.record_platform_account_deletion_failure',
  'auth_users_begin_platform_account_delete',
  'profiles_finalize_platform_account_delete',
  'Group ownership must be transferred before account deletion',
  'Profile deletion must be coordinated through Auth',
]) {
  if (!migration153c.includes(invariant)) fail(`Phase 15.3C migration missing invariant: ${invariant}`);
}
if (/\b(?:delete\s+from|insert\s+into|update)\s+storage\.(?:objects|buckets)\b/i.test(migration153c)) {
  fail('Phase 15.3C migration must never mutate Supabase Storage metadata with SQL');
}

const test153c = read(phase153cTest);
if (!/select\s+plan\s*\(\s*68\s*\)\s*;/i.test(test153c)) {
  fail('Phase 15.3C pgTAP suite must retain its 68-assertion plan');
}
for (const coverage of [
  'hard Auth deletion is blocked before Storage cleanup completes',
  'authoritative scoring history follows the documented profile cascade',
  'self-service exact confirmation prepares the same deletion engine',
  'direct hard Auth deletion cannot bypass pending-state and preparation checks',
]) {
  if (!test153c.includes(coverage)) fail(`Phase 15.3C pgTAP missing coverage: ${coverage}`);
}

const migration153e = read(phase153eMigration);
for (const invariant of [
  'private.user_reports',
  'private.moderation_cases',
  'private.moderation_case_notes',
  'private.moderation_case_events',
  'public.submit_user_report',
  'public.list_moderation_cases',
  'public.get_moderation_case_detail',
  'public.assign_moderation_case',
  'public.add_moderation_case_note',
  'public.update_moderation_case_status',
  'private.require_active_account()',
  'private.require_active_platform_admin()',
  'Users cannot report themselves',
  'Report submission limit reached; try again later',
  'This incident was already reported recently',
  "interval '2 years'",
  'Moderation evidence and history are immutable',
  "set search_path = ''",
]) {
  if (!migration153e.includes(invariant)) fail(`Phase 15.3E migration missing invariant: ${invariant}`);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(migration153e)) {
  fail('Phase 15.3E must not grant browser roles direct access to private moderation objects');
}
if (/['"]MESSAGE['"]/.test(
  migration153e.match(/create type public\.user_report_reference_type[\s\S]*?\);/)?.[0] || '',
)) {
  fail('Phase 15.3E must not invent message evidence before a durable message source exists');
}

const test153e = read(phase153eTest);
if (!/select\s+plan\s*\(\s*88\s*\)\s*;/i.test(test153e)) {
  fail('Phase 15.3E pgTAP suite must retain its 88-assertion plan');
}
for (const coverage of [
  'users cannot report themselves',
  'reported users cannot read case detail or reporter identity',
  'normalized duplicate incidents are rejected for 24 hours',
  'a reporter is limited to ten submissions in a rolling 24-hour window',
  'closed cases retain report, evidence, notes, and history for at least two years',
  'submission, assignment, note, review, and resolution remain in append-only history',
  'message evidence is not fabricated before a message source exists',
]) {
  if (!test153e.includes(coverage)) fail(`Phase 15.3E pgTAP missing coverage: ${coverage}`);
}

const migration153f = read(phase153fMigration);
for (const invariant of [
  'public.moderation_activity_type',
  'private.moderation_access_log',
  'private.resolve_moderation_subject',
  'private.append_moderation_access',
  'public.begin_moderation_activity_review',
  'public.list_moderation_activity_review',
  'private.require_active_platform_admin()',
  "access_kind in ('CASE_DETAIL', 'ACTIVITY_TIMELINE')",
  "interval '15 minutes'",
  "interval '2 years'",
  'workout_sessions',
  'group_members',
  'group_activity_reactions',
  'platform_admin_audit_log',
  'user_reports',
  'private.reject_moderation_immutable_mutation()',
  "set search_path = ''",
]) {
  if (!migration153f.includes(invariant)) fail(`Phase 15.3F migration missing invariant: ${invariant}`);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(migration153f)) {
  fail('Phase 15.3F must not grant browser roles direct access to private moderation objects');
}
if (/['"]COMMUNICATION['"]/.test(
  migration153f.match(/create type public\.moderation_activity_type[\s\S]*?\);/)?.[0] || '',
)) {
  fail('Phase 15.3F must not fabricate communication activity before Phase 15.4 creates a durable source');
}
for (const forbiddenField of ['w.notes', 'workout_sets', 'auth.users', 'auth.identities', 'auth.sessions']) {
  const timelineBody = migration153f.match(/create or replace function public\.list_moderation_activity_review[\s\S]*?\n\$\$;/)?.[0] || '';
  if (timelineBody.includes(forbiddenField)) {
    fail(`Phase 15.3F timeline must not expose forbidden source: ${forbiddenField}`);
  }
}

const test153f = read(phase153fTest);
if (!/select\s+plan\s*\(\s*45\s*\)\s*;/i.test(test153f)) {
  fail('Phase 15.3F pgTAP suite must retain its 45-assertion plan');
}
for (const coverage of [
  'ordinary users cannot begin sensitive activity review',
  'review grants are bound to the moderator who declared the purpose',
  'activity source selection is enforced server-side',
  'workout notes are redacted from moderation review',
  'report activity links back to its originating moderation case',
  'sensitive access audit is append-only',
  'identity snapshots preserve deletion-safe retained review context',
  'later Phase 15.4 adds communication only after creating a durable message source',
]) {
  if (!test153f.includes(coverage)) fail(`Phase 15.3F pgTAP missing coverage: ${coverage}`);
}

const migration154Enum = read(phase154EnumMigration);
const migration154 = read(phase154Migration);
if (!migration154Enum.includes("alter type public.moderation_activity_type add value if not exists 'COMMUNICATION'")) {
  fail('Phase 15.4 must add COMMUNICATION in its own committed enum migration');
}
for (const invariant of [
  'private.platform_messages',
  'private.platform_message_revisions',
  'private.platform_message_deliveries',
  'private.platform_message_events',
  'private.platform_message_previews',
  'private.resolve_platform_message_recipients',
  'private.platform_message_recipient_fingerprint',
  'public.preview_platform_message_audience',
  'public.send_platform_message',
  'public.edit_platform_message',
  'public.withdraw_platform_message',
  'public.list_platform_messages',
  'public.list_my_platform_messages',
  'public.mark_platform_message_read',
  'public.acknowledge_platform_message',
  'Full-platform blasts must be dismissible notices',
  'Full-platform blasts are dismissible and cannot require acknowledgement',
  "interval '2 years'",
  "set search_path = ''",
]) {
  if (!migration154.includes(invariant)) fail(`Phase 15.4 migration missing invariant: ${invariant}`);
}
if (/grant\s+[^;]*\bon\s+(?:table\s+|function\s+)?private\./i.test(migration154)) {
  fail('Phase 15.4 must not grant browser roles direct access to private messaging objects');
}
const test154 = read(phase154Test);
if (!/select\s+plan\s*\(\s*96\s*\)\s*;/i.test(test154)) {
  fail('Phase 15.4 pgTAP suite must retain its 96-assertion plan');
}
for (const coverage of [
  'group preview excludes suspended current members',
  'retrying a completed preview returns the original message idempotently',
  'recipient must read and acknowledge a newly edited revision again',
  'full-platform what-is-new popup cannot demand acknowledgement',
  'dismissed full-platform blast will not reopen on the next inbox load',
  'purpose-bounded moderation timeline includes retained communication activity',
  'administrator messaging does not create or alter XP events',
]) {
  if (!test154.includes(coverage)) fail(`Phase 15.4 pgTAP missing coverage: ${coverage}`);
}

const inboxDeletionMigrationPath = 'supabase/migrations/20260827195328_recipient_inbox_deletion.sql';
const inboxDeletionTestPath = 'supabase/tests/041_recipient_inbox_deletion.test.sql';
const groupChatMigrationPath = 'supabase/migrations/20260827195329_group_chat.sql';
const groupChatIndexMigrationPath = 'supabase/migrations/20260827222849_group_chat_foreign_key_indexes.sql';
const groupChatTestPath = 'supabase/tests/042_group_chat.test.sql';
for (const relativePath of [inboxDeletionMigrationPath, inboxDeletionTestPath, groupChatMigrationPath, groupChatIndexMigrationPath, groupChatTestPath]) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Messaging/social database artifact missing: ${relativePath}`);
}

const inboxDeletionMigration = read(inboxDeletionMigrationPath);
for (const invariant of [
  'add column deleted_at',
  'platform_message_deliveries_visible_recipient_idx',
  'pmd.deleted_at is null',
  'public.delete_my_platform_message',
  'Acknowledge this message before deleting it',
  'Recipient-only inbox tombstone',
]) {
  if (!inboxDeletionMigration.includes(invariant)) fail(`recipient inbox deletion migration missing invariant: ${invariant}`);
}
const inboxDeletionTest = read(inboxDeletionTestPath);
if (!/select\s+plan\s*\(\s*27\s*\)\s*;/i.test(inboxDeletionTest)) fail('recipient inbox deletion pgTAP suite must retain its 27-assertion plan');
for (const coverage of [
  'first recipient deletion does not affect the second recipient inbox',
  'required current revision cannot be deleted before acknowledgement',
  'recipient deletion never hard-deletes the retained delivery row',
  'inbox deletion does not create or alter XP events',
]) {
  if (!inboxDeletionTest.includes(coverage)) fail(`recipient inbox deletion pgTAP missing coverage: ${coverage}`);
}

const groupChatMigration = read(groupChatMigrationPath);
for (const invariant of [
  'public.group_chat_messages',
  'public.group_chat_reactions',
  'enable row level security',
  'revoke all on table public.group_chat_messages',
  'public.list_group_chat_messages',
  'public.post_group_chat_message',
  'public.set_group_chat_reaction',
  'public.delete_group_chat_message',
  'group chat members can receive change signals',
  'realtime.send',
  'Group chat rate limit reached; try again shortly',
  "deletion_reason in ('SELF', 'MODERATION')",
  "set search_path = ''",
]) {
  if (!groupChatMigration.includes(invariant)) fail(`group chat migration missing invariant: ${invariant}`);
}
if (/grant\s+(?:select|insert|update|delete)[^;]*on\s+(?:table\s+)?public\.group_chat_/i.test(groupChatMigration)) {
  fail('group chat tables must remain RPC-only with no direct browser table grants');
}
const groupChatIndexMigration = read(groupChatIndexMigrationPath);
for (const invariant of [
  'group_chat_reactions_group_message_idx',
  'on public.group_chat_reactions(group_id, message_id)',
  'group_chat_reactions_user_idx',
  'on public.group_chat_reactions(user_id)',
]) {
  if (!groupChatIndexMigration.includes(invariant)) fail(`group chat index migration missing invariant: ${invariant}`);
}
const groupChatTest = read(groupChatTestPath);
if (!/select\s+plan\s*\(\s*45\s*\)\s*;/i.test(groupChatTest)) fail('group chat pgTAP suite must retain its 45-assertion plan');
for (const coverage of [
  'outsider cannot read group chat',
  'ordinary member cannot delete another member message',
  'group owner can moderate another member message',
  'eleventh rolling-minute message is rate limited',
  'removed member immediately loses authoritative chat read access',
  'group chat messages and reactions never create or alter XP events',
]) {
  if (!groupChatTest.includes(coverage)) fail(`group chat pgTAP missing coverage: ${coverage}`);
}

const migration155 = read(phase155Migration);
for (const invariant of [
  'alter default privileges for role postgres in schema public',
  'revoke execute on functions from public, anon, authenticated',
  'revoke execute on all functions in schema public from public, anon',
  "pg_get_function_result(p.oid) = 'trigger'",
  'revoke execute on function %s from public, anon, authenticated',
  'Function execution is deny-by-default',
]) {
  if (!migration155.includes(invariant)) fail(`Phase 15.5 migration missing invariant: ${invariant}`);
}

const test155 = read(phase155Test);
if (!/select\s+plan\s*\(\s*27\s*\)\s*;/i.test(test155)) {
  fail('Phase 15.5 pgTAP suite must retain its 27-assertion plan');
}
for (const coverage of [
  'new public functions require an explicit authenticated grant',
  'anonymous callers cannot execute any existing public function',
  'authenticated callers cannot invoke trigger-only functions as RPCs',
  'group ownership does not grant platform administration',
  'global Data API pre-request guard blocks a suspended account across every feature RPC',
  'active platform administrator retains the integrated messaging boundary',
]) {
  if (!test155.includes(coverage)) fail(`Phase 15.5 pgTAP missing coverage: ${coverage}`);
}

const migration156a = read(phase156aMigration);
for (const invariant of [
  'preferred_weight_unit',
  'public.update_my_profile_settings',
  'private.require_active_account()',
  "set search_path = ''",
  'revoke update (username, display_name, timezone)',
  'grant execute on function public.update_my_profile_settings',
  'pending_weekly_workout_target_week_start',
  'Authoritative workout weights remain stored in kilograms',
]) {
  if (!migration156a.includes(invariant)) fail(`Phase 15.6A migration missing invariant: ${invariant}`);
}

const test156a = read(phase156aTest);
if (!/select\s+plan\s*\(\s*31\s*\)\s*;/i.test(test156a)) {
  fail('Phase 15.6A pgTAP suite must retain its 31-assertion plan');
}
for (const coverage of [
  'username cannot be updated directly',
  'self-profile RPC cannot alter another user',
  'scheduled weekly targets begin on a future Monday in the updated timezone',
  'suspended users cannot update profile settings',
  'profile preferences do not create or alter scoring events',
  'all settings updates leave authoritative weekly-goal history unchanged',
]) {
  if (!test156a.includes(coverage)) fail(`Phase 15.6A pgTAP missing coverage: ${coverage}`);
}

// Database validation intentionally stops at repository database contracts.
// GitHub Actions orchestration is a separate policy concern. Keeping those
// responsibilities decoupled prevents a CI trigger/job change from weakening
// or falsely failing the database contract gate.
console.log(`Database contract gate passed: ${migrations.length} migrations, ${tests.length} canonical pgTAP suites.`);
console.log('Runtime SQL execution remains hosted-Supabase authoritative; this repository contract gate does not start Docker or a local Supabase stack.');
