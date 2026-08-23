const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 15.8 validation failed: ${message}`);
};

const doc = read('docs/PHASE15.8-TRAINING-TIPS-PRESETS.md');
const tips = read('src/features/training-content/trainingTips.ts');
const tipSurface = read('src/features/training-content/TrainingTipSurface.tsx');
const presets = read('src/features/workout/presetWorkouts.ts');
const presetScreen = read('src/features/workout/components/WorkoutPresetStartScreen.tsx');
const controller = read('src/features/workout/components/WorkoutController.tsx');
const service = read('src/features/workout/workoutService.ts');
const dashboard = read('src/features/dashboard/components/DashboardController.tsx');
const migration = read('supabase/migrations/20260823223635_phase15_8_preset_workouts.sql');
const pgTap = read('supabase/tests/080_phase15_8_preset_workouts.test.sql');

ok(/\*\*IN PROGRESS\.\*\*/.test(doc) || /\*\*DONE\.\*\*/.test(doc), 'phase document must carry an explicit status');
for (const invariant of [
  'tips are curated in source control',
  'no LLM or remote AI service',
  'tips never change XP',
  'Presets deliberately do **not** define',
  'required weights',
  'required working-set counts',
  'required rep targets',
  'one authenticated database operation',
  'require the active workout to contain zero exercises',
  'failed preset must not leave a newly started half-populated workout behind',
  'ordinary empty workout start remains available',
  'immediate local timer',
]) {
  ok(doc.includes(invariant), `phase contract missing invariant: ${invariant}`);
}

ok(/export const trainingTips/.test(tips), 'curated training tip library must exist');
ok((tips.match(/id: '/g) || []).length >= 10, 'training tip library must retain at least ten curated entries');
ok(/trainingTipForDate/.test(tips), 'training tip selection must be deterministic and testable');
ok(!/fetch\(|supabase|openai|anthropic|llm/i.test(tips), 'training tips must not call remote/generative services');
ok(/aria-label="Training tip"/.test(tipSurface), 'training tip presentation must remain accessible');

for (const id of ['FULL_BODY', 'UPPER', 'LOWER', 'PUSH', 'PULL']) {
  ok(presets.includes(`id: '${id}'`), `preset library missing ${id}`);
}
ok(/resolvePresetExerciseIds/.test(presets), 'preset exercises must resolve through canonical catalogue data');
ok(/throw new Error\(`\$\{name\} is unavailable in the active exercise catalogue\.`\)/.test(presets), 'preset catalogue resolution must fail closed');

ok(/Start empty lift/.test(presetScreen), 'ordinary empty workout start must remain available');
ok(/Presets choose exercises only/.test(presetScreen), 'preset ownership of sets/reps/weights must be explicit');
ok(/preset\.exerciseNames\.every/.test(presetScreen), 'each preset must be enabled only when all required catalogue exercises exist');
ok(/Starting \$\{presetWorkouts/.test(presetScreen), 'preset start must retain immediate local timer feedback');
ok(/TrainingTipSurface/.test(presetScreen), 'pre-workout surface must use real curated tips');
ok(/TrainingTipSurface/.test(dashboard), 'dashboard must surface real curated tips');

ok(/startPresetWorkout\(exerciseIds: string\[\]/.test(service), 'workout service must expose preset start');
ok(/start_lifting_workout_from_preset/.test(service), 'preset start must use its atomic RPC');
ok(/p_exercise_ids: exerciseIds/.test(service), 'preset service must preserve ordered canonical ids');
ok(/p_action_at: actionTimestamp\(actionAtMs\)/.test(service), 'preset start must preserve intent-aware action timestamp');
ok(/resolvePresetExerciseIds\(presetWorkoutById\(presetId\), picker\.catalog\)/.test(controller), 'controller must resolve preset through loaded canonical catalogue');
ok(/workout\.startPreset\(exerciseIds, actionAtMs\)/.test(controller), 'controller must enter the normal workout lifecycle through preset start');
ok(/useExercisePickerCatalog\(true, pickerService\)/.test(controller), 'catalogue must be available before a preset is chosen');

for (const sqlInvariant of [
  'create or replace function public.start_lifting_workout_from_preset',
  'v_user_id uuid := auth.uid()',
  'cardinality(p_exercise_ids)',
  'count(distinct requested.exercise_id)',
  'e.active = true',
  'public.start_or_resume_lifting_workout_intent(p_action_at)',
  "raise exception 'Preset workout requires an empty active lift'",
  'unnest(p_exercise_ids) with ordinality',
  'revoke all on function public.start_lifting_workout_from_preset(uuid[], timestamptz) from anon',
  'grant execute on function public.start_lifting_workout_from_preset(uuid[], timestamptz) to authenticated',
]) {
  ok(migration.includes(sqlInvariant), `preset migration missing invariant: ${sqlInvariant}`);
}
ok(!/grant execute[\s\S]*to anon/i.test(migration), 'anonymous role must never execute preset start');

ok(/select plan\(10\)/i.test(pgTap), 'Phase 15.8 pgTAP must retain its 10-assertion plan');
for (const coverage of [
  'preset exercises persist atomically in requested order',
  'preset cannot overwrite or append onto a non-empty active lift',
  'duplicate preset exercises fail closed',
  'failed preset validation does not leave an active workout behind',
]) {
  ok(pgTap.includes(coverage), `Phase 15.8 pgTAP missing coverage: ${coverage}`);
}

console.log('Phase 15.8 structural gate passed: curated training tips and atomic canonical preset workout starts preserve the existing workout/scoring boundaries.');
