const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17 scoring-scale validation failed: ${message}`);
};

const migration = read('supabase/migrations/20260830210000_phase17_scoring_scale_hardening.sql');
const dbTest = read('supabase/tests/046_phase17_scoring_scale_hardening.test.sql');
const model = read('src/features/workout/mutations/workoutMutationModel.ts');
const replay = read('src/features/workout/mutations/workoutMutationReplay.ts');

ok(migration.includes('private.reconcile_lifting_v1_scoring_from_date'), 'suffix reconciler missing');
ok(!migration.includes('create or replace function public.reconcile_lifting_v1_scoring_for_user'), 'full authoritative reconciler must remain untouched');
ok(migration.includes('o.scoring_date < p_from_date'), 'suffix reconciler must seed PB state from the preserved prefix');
ok(migration.includes('scoring_date >= p_from_date'), 'suffix reconciler must rebuild the affected scoring-date suffix');
ok(migration.includes('least(v_old_date, v_new_date)'), 'date moves must reconcile from the earliest affected date');
ok(migration.includes("interval '90 days'"), 'server receipt retention must be 90 days');
ok(migration.includes("w.status <> 'IN_PROGRESS'"), 'active workout receipts must never be purged');
ok(migration.includes("'fitness-workout-receipt-retention'"), 'receipt retention cron missing');
ok(migration.includes("'17 4 * * *'"), 'receipt retention must run daily');

ok(model.includes('WORKOUT_MUTATION_MAX_REPLAY_AGE_MS = 30 * 24 * 60 * 60 * 1_000'), 'client replay window must be 30 days');
ok(model.includes('WORKOUT_MUTATION_EXPIRED_ERROR'), 'explicit stale replay error missing');
ok(replay.includes('replayedAt - current.createdAtMs > WORKOUT_MUTATION_MAX_REPLAY_AGE_MS'), 'stale queue items must be blocked before server replay');
ok(replay.includes('attemptedCount += 1;') && replay.indexOf('attemptedCount += 1;') > replay.indexOf('WORKOUT_MUTATION_MAX_REPLAY_AGE_MS'), 'expired mutations must not count as server attempts');

for (const fingerprint of ['scoring', 'observations', 'progress']) {
  ok(dbTest.includes(`name='${fingerprint}'`) || dbTest.includes(`'${fingerprint}'`), `parity fingerprint missing: ${fingerprint}`);
}
ok(dbTest.includes('suffix scoring events exactly match a full authoritative rebuild'), 'scoring parity assertion missing');
ok(dbTest.includes('suffix progress observations exactly match a full authoritative rebuild'), 'observation parity assertion missing');
ok(dbTest.includes('suffix current PB state exactly matches a full authoritative rebuild'), 'PB parity assertion missing');
ok(dbTest.includes('receipt retention does not alter XP or progress scoring'), 'receipt/scoring isolation assertion missing');
ok(/select\s+plan\s*\(\s*18\s*\)/i.test(dbTest), 'pgTAP plan must remain 18');
ok(dbTest.trimEnd().endsWith('rollback;'), 'pgTAP test must remain rollback safe');

console.log('Phase 17 scoring-scale validation passed: chronological suffix parity + 30d/90d bounded idempotency retention.');
