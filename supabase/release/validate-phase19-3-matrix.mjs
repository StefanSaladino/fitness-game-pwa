#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, 'phase19-3-exercise-muscle-matrix.json');
const additionsPath = path.join(here, 'phase19-3a-exercise-additions.json');
const reconciliationMigrationPath = path.join(
  here,
  '..',
  'migrations',
  '20260922010000_phase19_3b_exercise_catalog_reconciliation.sql',
);

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const additions = JSON.parse(fs.readFileSync(additionsPath, 'utf8'));
const reconciliationMigration = fs.readFileSync(reconciliationMigrationPath, 'utf8');

const fail = (message) => {
  console.error(`PHASE 19.3B MATRIX VALIDATION FAILED: ${message}`);
  process.exit(1);
};

const allowedGroups = new Set([
  'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','QUADS','HAMSTRINGS',
  'GLUTES','CALVES','CORE','OBLIQUES','FOREARMS_GRIP','NECK',
]);
const allowedConfidence = new Set(['HIGH','MEDIUM','LOW']);
const allowedMeasurement = new Set(['WEIGHT_REPS','BODYWEIGHT_REPS','DURATION','OTHER']);
const allowedModes = new Set(['WEIGHT_EPLEY','BODYWEIGHT_REPS','NONE']);

if (matrix.methodology_version !== 'muscle-volume-v1') fail('unexpected methodology version');
if (matrix.phase !== '19.3B') fail(`expected phase 19.3B, found ${matrix.phase}`);
if (!Array.isArray(matrix.exercises)) fail('exercises must be an array');
if (matrix.exercises.length !== 568) fail(`expected 568 exercises, found ${matrix.exercises.length}`);
if (
  matrix.catalog_count !== 568 ||
  matrix.eligible_count !== 418 ||
  matrix.excluded_count !== 150 ||
  matrix.contribution_count !== 781
) {
  fail('matrix metadata counts do not match locked Phase 19.3B counts');
}
if (additions.additions_count !== 58 || additions.exercises.length !== 58) {
  fail('unexpected historical Phase 19.3A additions artifact count');
}

const reconciliationBlock = reconciliationMigration.match(
  /with additions\(canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,template_name\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.exercise_catalog/
);
if (!reconciliationBlock) fail('could not locate Phase 19.3B reconciliation additions');

const reconciliationRowPattern =
  /^\s*\('((?:''|[^'])*)','([^']+)','([^']+)','([^']+)',array\[[^\]]*\]::text\[],(null|'((?:''|[^'])*)')\),?\s*$/gm;
const reconciliationNames = [];
let reconciliationMatch;
while ((reconciliationMatch = reconciliationRowPattern.exec(reconciliationBlock[1])) !== null) {
  reconciliationNames.push(reconciliationMatch[1].replace(/''/g, "'"));
}
if (reconciliationNames.length !== 104) {
  fail(`expected 104 Phase 19.3B reconciliation additions, found ${reconciliationNames.length}`);
}

const names = new Set();
let eligible = 0;
let excluded = 0;
let contributionRows = 0;

for (const exercise of matrix.exercises) {
  if (!exercise.canonical_name) fail('exercise missing canonical_name');
  if (names.has(exercise.canonical_name)) fail(`duplicate canonical_name: ${exercise.canonical_name}`);
  names.add(exercise.canonical_name);

  if (!allowedMeasurement.has(exercise.measurement_type)) {
    fail(`${exercise.canonical_name}: invalid measurement_type`);
  }
  if (!allowedConfidence.has(exercise.mapping_confidence)) {
    fail(`${exercise.canonical_name}: invalid mapping_confidence`);
  }
  if (!allowedModes.has(exercise.set_quality_mode)) {
    fail(`${exercise.canonical_name}: invalid set_quality_mode`);
  }
  if (!Array.isArray(exercise.contributions)) {
    fail(`${exercise.canonical_name}: contributions must be an array`);
  }

  contributionRows += exercise.contributions.length;
  const seenMuscles = new Set();
  let directCount = 0;

  for (const contribution of exercise.contributions) {
    if (!allowedGroups.has(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: invalid reportable muscle ${contribution.muscle_group}`);
    }
    if (seenMuscles.has(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: duplicate contribution ${contribution.muscle_group}`);
    }
    seenMuscles.add(contribution.muscle_group);

    if (contribution.role === 'DIRECT') {
      directCount += 1;
      if (contribution.weight !== 1) fail(`${exercise.canonical_name}: DIRECT weight must be 1.0`);
    } else if (contribution.role === 'INDIRECT') {
      if (contribution.weight !== 0.5) fail(`${exercise.canonical_name}: INDIRECT weight must be 0.5`);
    } else {
      fail(`${exercise.canonical_name}: invalid contribution role ${contribution.role}`);
    }
  }

  if (exercise.volume_eligible) {
    eligible += 1;
    if (exercise.contributions.length === 0) fail(`${exercise.canonical_name}: eligible row has no contributions`);
    if (directCount === 0) fail(`${exercise.canonical_name}: eligible row has no DIRECT contribution`);
    if (exercise.measurement_type === 'WEIGHT_REPS' && exercise.set_quality_mode !== 'WEIGHT_EPLEY') {
      fail(`${exercise.canonical_name}: WEIGHT_REPS must use WEIGHT_EPLEY`);
    }
    if (exercise.measurement_type === 'BODYWEIGHT_REPS' && exercise.set_quality_mode !== 'BODYWEIGHT_REPS') {
      fail(`${exercise.canonical_name}: eligible BODYWEIGHT_REPS must use BODYWEIGHT_REPS`);
    }
    if (exercise.measurement_type === 'DURATION' || exercise.measurement_type === 'OTHER') {
      fail(`${exercise.canonical_name}: DURATION/OTHER must not be eligible in v1`);
    }
  } else {
    excluded += 1;
    if (exercise.contributions.length !== 0) fail(`${exercise.canonical_name}: excluded row has contributions`);
    if (exercise.set_quality_mode !== 'NONE') fail(`${exercise.canonical_name}: excluded row must use NONE`);
  }

  if (exercise.primary_muscle_group === 'FULL_BODY' && exercise.volume_eligible) {
    fail(`${exercise.canonical_name}: FULL_BODY must remain excluded in muscle-volume-v1`);
  }

  if (exercise.workout_type === 'PLYOMETRIC') {
    if (exercise.canonical_name === 'Jump Rope') {
      if (exercise.measurement_type !== 'DURATION') fail('Jump Rope must remain DURATION');
    } else {
      if (exercise.measurement_type !== 'BODYWEIGHT_REPS') {
        fail(`${exercise.canonical_name}: rep-based plyometric must use BODYWEIGHT_REPS`);
      }
      if (exercise.volume_eligible || exercise.set_quality_mode !== 'NONE' || exercise.contributions.length !== 0) {
        fail(`${exercise.canonical_name}: plyometric must remain excluded from muscle-volume-v1`);
      }
    }
  }
}

if (eligible !== 418) fail(`expected 418 eligible exercises, found ${eligible}`);
if (excluded !== 150) fail(`expected 150 excluded exercises, found ${excluded}`);
if (contributionRows !== 781) fail(`expected 781 contribution rows, found ${contributionRows}`);

for (const addition of additions.exercises) {
  if (!names.has(addition.canonical_name)) fail(`missing historical Phase 19.3A exercise: ${addition.canonical_name}`);
}
for (const name of reconciliationNames) {
  if (!names.has(name)) fail(`missing Phase 19.3B reconciliation exercise: ${name}`);
}

const get = (name) => matrix.exercises.find((row) => row.canonical_name === name) ?? fail(`missing sentinel ${name}`);
const mapping = (name) => new Map(get(name).contributions.map((c) => [c.muscle_group, `${c.role}:${c.weight}`]));
const expect = (name, expected) => {
  const actual = mapping(name);
  const wanted = new Map(Object.entries(expected));
  if (actual.size !== wanted.size) fail(`${name}: unexpected contribution count`);
  for (const [muscle, value] of wanted) {
    if (actual.get(muscle) !== value) {
      fail(`${name}: expected ${muscle}=${value}, found ${actual.get(muscle)}`);
    }
  }
};

expect('Barbell Bench Press', {CHEST:'DIRECT:1', SHOULDERS:'INDIRECT:0.5', TRICEPS:'INDIRECT:0.5'});
expect('Dumbbell Close-Grip Bench Press', {TRICEPS:'DIRECT:1', CHEST:'INDIRECT:0.5', SHOULDERS:'INDIRECT:0.5'});
expect('Dumbbell Kickstand Romanian Deadlift', {HAMSTRINGS:'DIRECT:1', GLUTES:'DIRECT:1', BACK:'INDIRECT:0.5'});
expect('Dumbbell High Row', {BACK:'DIRECT:1', SHOULDERS:'DIRECT:1', BICEPS:'INDIRECT:0.5'});
expect('Dumbbell Russian Twist', {OBLIQUES:'DIRECT:1', CORE:'INDIRECT:0.5'});

const egyptian = get('Egyptian Cable Lateral Raise');
if (!egyptian.volume_eligible || egyptian.measurement_type !== 'WEIGHT_REPS') {
  fail('Egyptian Cable Lateral Raise must be a volume-eligible weighted exercise');
}
const squatJump = get('Squat Jump');
if (squatJump.measurement_type !== 'BODYWEIGHT_REPS' || squatJump.volume_eligible || squatJump.contributions.length !== 0) {
  fail('Squat Jump must be rep-trackable while excluded from muscle-volume-v1');
}
const plyometricPullUp = get('Plyometric Pull-Up');
if (plyometricPullUp.measurement_type !== 'BODYWEIGHT_REPS' || plyometricPullUp.volume_eligible || plyometricPullUp.contributions.length !== 0) {
  fail('Plyometric Pull-Up must be rep-trackable while excluded from muscle-volume-v1');
}

for (const name of ['Dumbbell Clean','Dumbbell Snatch','Dumbbell Thruster','Dumbbell Devil Press']) {
  const row = get(name);
  if (row.volume_eligible || row.set_quality_mode !== 'NONE' || row.contributions.length !== 0) {
    fail(`${name}: FULL_BODY historical sentinel must remain excluded`);
  }
}

console.log('Phase 19.3B muscle-volume matrix: VALID');
console.log('Catalog rows: 568');
console.log('Volume eligible: 418');
console.log('Excluded/deferred: 150');
console.log('Contribution rows: 781');
console.log('Historical Phase 19.3A additions: 58');
console.log('Phase 19.3B reconciliation additions: 104');
console.log('Plyometric catalogue: 35 total / 34 rep-based');
console.log('Methodology: muscle-volume-v1');
