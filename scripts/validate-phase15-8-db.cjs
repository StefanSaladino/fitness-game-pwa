const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20260823223635_phase15_8_preset_workouts.sql');
const testPath = path.join(root, 'supabase/tests/080_phase15_8_preset_workouts.test.sql');
const fail = (message) => { throw new Error(`Phase 15.8 database validation failed: ${message}`); };

if (!fs.existsSync(migrationPath)) fail('preset migration is missing');
if (!fs.existsSync(testPath)) fail('preset pgTAP suite is missing');

const migration = fs.readFileSync(migrationPath, 'utf8');
const test = fs.readFileSync(testPath, 'utf8');
for (const invariant of [
  'public.start_lifting_workout_from_preset',
  'auth.uid()',
  'public.start_or_resume_lifting_workout_intent(p_action_at)',
  'unnest(p_exercise_ids) with ordinality',
  'Preset workout requires an empty active lift',
  'to authenticated',
]) {
  if (!migration.includes(invariant)) fail(`migration missing ${invariant}`);
}
if (/grant execute[\s\S]*to anon/i.test(migration)) fail('anon must not receive preset RPC execution');
if (!/select\s+plan\s*\(\s*10\s*\)/i.test(test)) fail('pgTAP suite must retain 10 assertions');
if (!/rollback\s*;\s*$/i.test(test.trim())) fail('pgTAP suite must remain rollback safe');

console.log('Phase 15.8 database contract gate passed.');
