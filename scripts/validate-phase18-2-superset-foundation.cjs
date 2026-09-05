const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = 'supabase/migrations/20260905041946_phase18_2_superset_foundation.sql';
const pgTapPath = 'supabase/tests/102_phase18_2_superset_foundation.test.sql';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function ok(condition, message) {
  if (!condition) throw new Error(`Phase 18.2 Superset foundation validation failed: ${message}`);
}

for (const relativePath of [
  migrationPath,
  pgTapPath,
  'src/features/workout/model.ts',
  'src/features/workout/workoutExerciseService.ts',
  'src/features/workout/recovery/workoutRecoveryModel.ts',
  'src/types/database.generated.ts',
]) {
  ok(fs.existsSync(path.join(root, relativePath)), `missing required artifact: ${relativePath}`);
}

const migration = read(migrationPath).toLowerCase();
for (const invariant of [
  'alter table public.workout_exercises',
  'superset_group_id uuid',
  'superset_order integer',
  'workout_exercises_superset_membership_pair',
  'workout_exercises_superset_order_nonnegative',
  'superset_order >= 0',
  'workout_exercises_superset_member_order_unique',
  '(workout_id, superset_group_id, superset_order)',
  'where superset_group_id is not null',
]) {
  ok(migration.includes(invariant), `migration missing invariant: ${invariant}`);
}

for (const forbidden of [
  'create table',
  'security definer',
  'create trigger',
  'grant execute',
  'scoring_events',
  'xp_events',
  'exercise_progress',
  'performance_observations',
]) {
  ok(!migration.includes(forbidden), `migration must not broaden Phase 18.2 scope with: ${forbidden}`);
}

const model = read('src/features/workout/model.ts');
ok(/supersetGroupId:\s*string \| null;/.test(model), 'WorkoutExercise must expose nullable Superset group identity');
ok(/supersetOrder:\s*number \| null;/.test(model), 'WorkoutExercise must expose nullable Superset order');

const service = read('src/features/workout/workoutExerciseService.ts');
ok(service.includes('superset_group_id, superset_order'), 'workout exercise reads must request Superset metadata');
ok(service.includes('supersetGroupId: row.superset_group_id'), 'service must map Superset group identity');
ok(service.includes('supersetOrder: row.superset_order'), 'service must map Superset order');
ok(service.includes("candidate.code !== '42703' && candidate.code !== 'PGRST204'"), 'pre-migration fallback must be restricted to known missing-column errors');
ok(service.includes("detail.includes('superset_group_id') || detail.includes('superset_order')"), 'pre-migration fallback must name only Superset columns');
ok(service.includes(".select('id, workout_id, exercise_id, order_index, revision')"), 'pre-migration fallback must use the legacy projection');
ok(!/setSuperset|createSuperset|linkSuperset/.test(service), 'Phase 18.2 must not add the builder mutation API early');

const recovery = read('src/features/workout/recovery/workoutRecoveryModel.ts');
for (const invariant of [
  'supersetGroupId: string | null',
  'supersetOrder: number | null',
  'supersetGroupId: exercise.supersetGroupId',
  'supersetOrder: exercise.supersetOrder',
  'supersetMembershipKeys',
]) {
  ok(recovery.includes(invariant), `recovery contract missing invariant: ${invariant}`);
}
ok(recovery.includes("supersetGroupId === undefined"), 'legacy recovery snapshots must tolerate missing Superset group metadata');
ok(recovery.includes("supersetOrder === undefined"), 'legacy recovery snapshots must tolerate missing Superset order metadata');

const generated = read('src/types/database.generated.ts');
ok(generated.includes('superset_group_id: string | null'), 'generated database Row type must include Superset group identity');
ok(generated.includes('superset_order: number | null'), 'generated database Row type must include Superset order');
ok(generated.includes('superset_group_id?: string | null'), 'generated database write types must keep Superset group optional');
ok(generated.includes('superset_order?: number | null'), 'generated database write types must keep Superset order optional');

const pgTap = read(pgTapPath).toLowerCase();
for (const invariant of [
  'select plan(10);',
  "'superset_group_id'",
  "'superset_order'",
  'col_is_null',
  'col_has_check',
  'has_index',
  'index_is_unique',
  'rollback;',
]) {
  ok(pgTap.includes(invariant), `pgTAP contract missing invariant: ${invariant}`);
}

console.log('Phase 18.2 Superset foundation validation passed: nullable grouped exercise metadata is constrained, recovery-safe, and scoring-neutral.');
