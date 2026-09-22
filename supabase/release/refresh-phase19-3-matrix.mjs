#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, 'phase19-3-exercise-muscle-matrix.json');
const migrationPath = path.join(here, '..', 'migrations', '20260922010000_phase19_3b_exercise_catalog_reconciliation.sql');

const fail = (message) => {
  throw new Error(`Phase 19.3B matrix refresh failed: ${message}`);
};

if (!fs.existsSync(matrixPath)) fail(`missing ${matrixPath}`);
if (!fs.existsSync(migrationPath)) fail(`missing ${migrationPath}`);

const original = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const migration = fs.readFileSync(migrationPath, 'utf8');

const block = migration.match(
  /with additions\(canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,template_name\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.exercise_catalog/
);
if (!block) fail('could not locate the Phase 19.3B additions CTE');

const rowPattern =
  /^\s*\('((?:''|[^'])*)','([^']+)','([^']+)','([^']+)',array\[[^\]]*\]::text\[],(null|'((?:''|[^'])*)')\),?\s*$/gm;

const additions = [];
let match;
while ((match = rowPattern.exec(block[1])) !== null) {
  const decode = (value) => value.replace(/''/g, "'");
  additions.push({
    canonical_name: decode(match[1]),
    measurement_type: match[2],
    primary_muscle_group: match[3],
    workout_type: match[4],
    template_name: match[5] === 'null' ? null : decode(match[6]),
  });
}

if (additions.length !== 104) fail(`expected 104 reconciliation additions, found ${additions.length}`);

const additionNames = new Set(additions.map((row) => row.canonical_name));
const baseExercises = original.exercises.filter((row) => !additionNames.has(row.canonical_name));

if (baseExercises.length !== 464) {
  fail(`expected 464 pre-reconciliation rows after removing Phase 19.3B additions, found ${baseExercises.length}`);
}

const plyometricRationale =
  'Plyometric/ballistic movement is trackable by repetitions and optional added load, but remains excluded from muscle-volume-v1 because the current hypertrophy set-stimulus model is not calibrated for explosive contacts.';

for (const row of baseExercises) {
  if (row.workout_type === 'PLYOMETRIC' && row.canonical_name !== 'Jump Rope') {
    row.measurement_type = 'BODYWEIGHT_REPS';
    row.volume_eligible = false;
    row.set_quality_mode = 'NONE';
    row.mapping_confidence = 'HIGH';
    row.review_flag = true;
    row.contributions = [];
    row.rationale = plyometricRationale;
  }
}

const baseByName = new Map(baseExercises.map((row) => [row.canonical_name, row]));

const newRows = additions.map((addition) => {
  if (addition.template_name === null) {
    return {
      canonical_name: addition.canonical_name,
      measurement_type: addition.measurement_type,
      primary_muscle_group: addition.primary_muscle_group,
      workout_type: addition.workout_type,
      volume_eligible: false,
      set_quality_mode: 'NONE',
      mapping_confidence: 'HIGH',
      review_flag: true,
      contributions: [],
      rationale: plyometricRationale,
    };
  }

  const template = baseByName.get(addition.template_name);
  if (!template) fail(`${addition.canonical_name}: missing template ${addition.template_name}`);

  return {
    canonical_name: addition.canonical_name,
    measurement_type: addition.measurement_type,
    primary_muscle_group: addition.primary_muscle_group,
    workout_type: addition.workout_type,
    volume_eligible: template.volume_eligible,
    set_quality_mode:
      addition.measurement_type === 'BODYWEIGHT_REPS'
        ? 'BODYWEIGHT_REPS'
        : template.set_quality_mode,
    mapping_confidence: template.mapping_confidence,
    review_flag: template.review_flag,
    contributions: template.contributions.map((entry) => ({ ...entry })),
    rationale:
      `${template.rationale} This equipment/bodyweight variant uses the same reviewed movement-pattern contribution model as ${addition.template_name}.`,
  };
});

const exercises = [...baseExercises, ...newRows];
const eligible = exercises.filter((row) => row.volume_eligible).length;
const excluded = exercises.length - eligible;
const contributionCount = exercises.reduce((sum, row) => sum + row.contributions.length, 0);
const plyometricRows = exercises.filter((row) => row.workout_type === 'PLYOMETRIC');
const repPlyometricRows = plyometricRows.filter((row) => row.measurement_type === 'BODYWEIGHT_REPS');

if (exercises.length !== 568) fail(`expected 568 exercises, found ${exercises.length}`);
if (eligible !== 418) fail(`expected 418 eligible exercises, found ${eligible}`);
if (excluded !== 150) fail(`expected 150 excluded exercises, found ${excluded}`);
if (contributionCount !== 781) fail(`expected 781 contribution rows, found ${contributionCount}`);
if (plyometricRows.length !== 35) fail(`expected 35 plyometric exercises, found ${plyometricRows.length}`);
if (repPlyometricRows.length !== 34) fail(`expected 34 rep-based plyometrics, found ${repPlyometricRows.length}`);

const names = new Set();
for (const row of exercises) {
  if (names.has(row.canonical_name)) fail(`duplicate canonical_name ${row.canonical_name}`);
  names.add(row.canonical_name);
}

const historicalNotes = (original.notes ?? []).filter(
  (note) =>
    !note.includes('Phase 19.3A expands the catalogue') &&
    !note.includes('Phase 19.3B reconciles the catalogue')
);

const refreshed = {
  methodology_version: 'muscle-volume-v1',
  phase: '19.3B',
  catalog_snapshot_date: '2026-09-22',
  catalog_count: 568,
  eligible_count: 418,
  excluded_count: 150,
  contribution_count: 781,
  reportable_muscle_groups: original.reportable_muscle_groups,
  contribution_weights: original.contribution_weights,
  notes: [
    ...historicalNotes,
    'Phase 19.3B reconciles the source artifact to 568 active canonical exercises: 418 volume-eligible and 150 explicitly excluded/deferred, with 781 exercise-to-muscle contribution rows.',
    'Rep-based plyometrics use BODYWEIGHT_REPS so bodyweight and optional added-load sets can be logged, while remaining explicitly excluded from muscle-volume-v1 hypertrophy scoring until a ballistic set-stimulus calibration exists.',
  ],
  exercises,
};

const tempPath = `${matrixPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(refreshed, null, 2)}\n`, 'utf8');
fs.renameSync(tempPath, matrixPath);

console.log('Phase 19.3B matrix refreshed.');
console.log('Catalog rows: 568');
console.log('Volume eligible: 418');
console.log('Excluded/deferred: 150');
console.log('Contribution rows: 781');
console.log('Plyometric rows: 35 (34 BODYWEIGHT_REPS + Jump Rope duration)');
