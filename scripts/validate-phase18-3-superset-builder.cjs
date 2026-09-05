const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = 'supabase/migrations/20260905042036_phase18_3_superset_mutations.sql';
const receiptMigrationPath = 'supabase/migrations/20260905042230_phase18_3_superset_receipt_kinds.sql';
const receiptPgTapPath = 'supabase/tests/104_phase18_3_superset_receipt_kinds.test.sql';
const pgTapPath = 'supabase/tests/103_phase18_3_superset_mutations.test.sql';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function ok(condition, message) {
  if (!condition) throw new Error(`Phase 18.3 Superset builder validation failed: ${message}`);
}

for (const relativePath of [
  migrationPath,
  pgTapPath,
  receiptMigrationPath,
  receiptPgTapPath,
  'src/features/workout/mutations/workoutMutationModel.ts',
  'src/features/workout/hooks/useWorkoutExercises.ts',
  'src/features/workout/components/SupersetBuilder.tsx',
  'src/features/workout/components/SupersetBuilder.module.css',
  'src/features/workout/components/WorkoutSessionScreen.tsx',
]) {
  ok(fs.existsSync(path.join(root, relativePath)), `missing required artifact: ${relativePath}`);
}

const migration = read(migrationPath);
for (const invariant of [
  'private.enforce_lifting_superset_shape',
  'create constraint trigger workout_exercises_superset_shape',
  'deferrable initially deferred',
  'count(*) < 2',
  'max(we.superset_order) <> count(*) - 1',
  'private.assert_lifting_superset_snapshot',
  'private.set_lifting_workout_superset',
  'private.clear_lifting_workout_superset',
  "when 'SET_SUPERSET' then",
  "when 'CLEAR_SUPERSET' then",
  'WORKOUT_CONFLICT: Superset membership changed on the server.',
  'jsonb_array_length(v_members) < 2',
  'v_min_order <> 0',
  'v_max_order <> v_count - 1',
  'revoke all on function private.set_lifting_workout_superset',
]) {
  ok(migration.includes(invariant), `migration missing guarded invariant: ${invariant}`);
}
for (const forbidden of ['grant execute on function private.set_lifting_workout_superset', 'scoring_events', 'xp_events', 'exercise_progress']) {
  ok(!migration.includes(forbidden), `migration must not broaden Superset mutation scope with: ${forbidden}`);
}

const receiptMigration = read(receiptMigrationPath);
for (const invariant of [
  'workout_mutation_receipts_kind_check',
  "'SET_SUPERSET'",
  "'CLEAR_SUPERSET'",
]) {
  ok(receiptMigration.includes(invariant), `receipt migration missing invariant: ${invariant}`);
}

const mutationModel = read('src/features/workout/mutations/workoutMutationModel.ts');
ok(mutationModel.includes("kind: 'SET_SUPERSET'"), 'mutation queue must persist SET_SUPERSET');
ok(mutationModel.includes("kind: 'CLEAR_SUPERSET'"), 'mutation queue must persist CLEAR_SUPERSET');
ok(mutationModel.includes('expectedSupersetGroupId'), 'Superset target rows must carry expected current membership');
ok(mutationModel.includes('expectedMembers'), 'Superset edits must carry the complete previous membership snapshot');

const hook = read('src/features/workout/hooks/useWorkoutExercises.ts');
for (const invariant of ['saveSuperset', 'clearSuperset', "runMutation(\n      'superset'", 'createIdempotencyKey()', "kind: 'SET_SUPERSET'", "kind: 'CLEAR_SUPERSET'"]) {
  ok(hook.includes(invariant), `workout composition hook missing invariant: ${invariant}`);
}
ok(hook.includes('Superset changes require the protected workout mutation queue.'), 'Superset writes must fail closed without the queue');

const builder = read('src/features/workout/components/SupersetBuilder.tsx');
for (const invariant of ['Create Superset', 'Manage Superset', 'Break Superset apart', 'Superset order', 'Already in another Superset']) {
  ok(builder.includes(invariant), `builder missing UX contract: ${invariant}`);
}

const screen = read('src/features/workout/components/WorkoutSessionScreen.tsx');
ok(screen.includes('SupersetBuilder'), 'active workout must expose the Superset builder');
ok(screen.includes('supersetMarker'), 'grouped exercises must visibly identify their Superset sequence');
ok(screen.includes('supersetGroupHeader'), 'grouped exercises must render inside a shared Superset card');

const pgTap = read(pgTapPath);
const receiptPgTap = read(receiptPgTapPath);
ok(pgTap.includes('select plan(10);'), 'pgTAP plan must cover the 18.3 contract');
ok(pgTap.includes("'workout_exercises_superset_shape'"), 'pgTAP must verify the deferred Superset shape trigger');
ok(pgTap.includes("'SET_SUPERSET'"), 'pgTAP must verify SET_SUPERSET routing');
ok(pgTap.includes("'CLEAR_SUPERSET'"), 'pgTAP must verify CLEAR_SUPERSET routing');
ok(receiptPgTap.includes("'SET_SUPERSET'"), 'receipt pgTAP must verify SET_SUPERSET is accepted');
ok(receiptPgTap.includes("'CLEAR_SUPERSET'"), 'receipt pgTAP must verify CLEAR_SUPERSET is accepted');

console.log('Phase 18.3 Superset builder validation passed: guarded idempotent group mutations, revision conflict safety, and local builder UX are present.');
