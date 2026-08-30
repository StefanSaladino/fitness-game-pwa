const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17.3 validation failed: ${message}`);
};

const resetSql = read('supabase/release/phase17-production-statistics-reset.sql');
const resetTest = read('supabase/tests/044_phase17_3_release_reset_contract.test.sql');
const indexedDb = read('src/features/workout/storage/workoutIndexedDb.ts');
const recovery = read('src/features/workout/recovery/workoutRecoveryStorage.ts');
const mutations = read('src/features/workout/mutations/workoutMutationStorage.ts');

const resetTables = [
  'group_activity_reactions',
  'workout_sets',
  'workout_mutation_receipts',
  'exercise_progress_observations',
  'performance_observations',
  'performance_benchmarks',
  'workout_exercises',
  'exercise_progress',
  'scoring_events',
  'xp_events',
  'weekly_lifting_snapshots',
  'lifting_consistency_state',
  'user_badges',
  'weekly_goals',
  'workout_sessions',
];

const preservedTables = [
  'profiles',
  'notification_preferences',
  'exercise_catalog',
  'groups',
  'group_members',
  'group_invites',
  'group_chat_messages',
  'group_chat_reactions',
  'platform_account_state',
  'platform_admins',
  'platform_admin_audit_log',
  'platform_messages',
  'moderation_cases',
  'user_reports',
  'platform_capacity_allowances',
  'push_subscriptions',
];

function deleteTargets(sql) {
  return [...sql.matchAll(/delete\s+from\s+public\.([a-z0-9_]+)\s*;/gi)].map((match) => match[1]);
}

const resetTargets = deleteTargets(resetSql);
const testTargets = deleteTargets(resetTest);

ok(JSON.stringify(resetTargets) === JSON.stringify(resetTables), 'operator SQL delete order/scope changed');
ok(JSON.stringify(testTargets) === JSON.stringify(resetTables), 'pgTAP reset block must mirror operator SQL exactly');
ok(new Set(resetTargets).size === resetTargets.length, 'operator SQL contains duplicate DELETE targets');

for (const table of preservedTables) {
  ok(!resetTargets.includes(table), `preserved table ${table} must never be deleted`);
}

ok(resetSql.includes("'REPLACE_ME_DO_NOT_RUN_IN_PHASE17_3'"), 'checked-in operator SQL must retain the inert confirmation placeholder');
ok(resetSql.includes("'RESET_TOP_SET_PRODUCTION_STATISTICS_2026'"), 'operator SQL must require the exact release confirmation phrase');
ok(/\brollback\s*;\s*$/i.test(resetSql), 'checked-in operator SQL must end in ROLLBACK');
ok(!/\bcommit\s*;/i.test(resetSql), 'checked-in operator SQL must not contain an executable COMMIT');
ok(resetSql.includes('begin isolation level repeatable read;'), 'reset must use a repeatable-read transaction');
ok(resetSql.includes('in access exclusive mode;'), 'reset must lock statistical tables against concurrent writes');
ok(resetSql.includes('PHASE17_RESET_DELETE_BLOCK_START') && resetSql.includes('PHASE17_RESET_DELETE_BLOCK_END'), 'reset delete block markers are required');

ok(indexedDb.includes('WORKOUT_PERSISTENCE_EPOCH = 2'), 'workout persistence epoch must be 2');
ok(indexedDb.includes('fitness-game-workout-v${WORKOUT_PERSISTENCE_EPOCH}'), 'IndexedDB database name must be epoch-scoped');
ok(recovery.includes('active-workout:v${WORKOUT_PERSISTENCE_EPOCH}:'), 'recovery durable key must use the current epoch');
ok(recovery.includes("'fitness-game:active-workout:v1:'"), 'recovery storage must explicitly retire v1 fallback state');
ok(mutations.includes('workout-mutations:v${WORKOUT_PERSISTENCE_EPOCH}:'), 'mutation durable key must use the current epoch');
ok(mutations.includes("'fitness-game:workout-mutations:v1:'"), 'mutation storage must explicitly retire v1 fallback state');

ok(resetTest.trimEnd().endsWith('rollback;'), 'pgTAP reset contract must always roll back');

console.log(`Phase 17.3 release-reset validation passed: ${resetTables.length} reset tables, ${preservedTables.length} protected table contracts, persistence epoch 2.`);
