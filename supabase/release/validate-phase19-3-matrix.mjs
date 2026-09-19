#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, 'phase19-3-exercise-muscle-matrix.json');
const additionsPath = path.join(here, 'phase19-3a-exercise-additions.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const additions = JSON.parse(fs.readFileSync(additionsPath, 'utf8'));

const fail = (message) => {
  console.error(`PHASE 19.3A MATRIX VALIDATION FAILED: ${message}`);
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
if (matrix.phase !== '19.3A') fail(`expected phase 19.3A, found ${matrix.phase}`);
if (!Array.isArray(matrix.exercises)) fail('exercises must be an array');
if (matrix.exercises.length !== 464) fail(`expected 464 exercises, found ${matrix.exercises.length}`);
if (matrix.catalog_count !== 464 || matrix.eligible_count !== 326 || matrix.excluded_count !== 138) {
  fail('matrix metadata counts do not match locked Phase 19.3A counts');
}
if (additions.additions_count !== 58 || additions.exercises.length !== 58) fail('unexpected additions artifact count');

const names = new Set();
let eligible = 0;
let excluded = 0;
for (const exercise of matrix.exercises) {
  if (!exercise.canonical_name) fail('exercise missing canonical_name');
  if (names.has(exercise.canonical_name)) fail(`duplicate canonical_name: ${exercise.canonical_name}`);
  names.add(exercise.canonical_name);
  if (!allowedMeasurement.has(exercise.measurement_type)) fail(`${exercise.canonical_name}: invalid measurement_type`);
  if (!allowedConfidence.has(exercise.mapping_confidence)) fail(`${exercise.canonical_name}: invalid mapping_confidence`);
  if (!allowedModes.has(exercise.set_quality_mode)) fail(`${exercise.canonical_name}: invalid set_quality_mode`);
  if (!Array.isArray(exercise.contributions)) fail(`${exercise.canonical_name}: contributions must be an array`);

  const seenMuscles = new Set();
  let directCount = 0;
  for (const contribution of exercise.contributions) {
    if (!allowedGroups.has(contribution.muscle_group)) fail(`${exercise.canonical_name}: invalid reportable muscle ${contribution.muscle_group}`);
    if (seenMuscles.has(contribution.muscle_group)) fail(`${exercise.canonical_name}: duplicate contribution ${contribution.muscle_group}`);
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
    if (exercise.measurement_type === 'WEIGHT_REPS' && exercise.set_quality_mode !== 'WEIGHT_EPLEY') fail(`${exercise.canonical_name}: WEIGHT_REPS must use WEIGHT_EPLEY`);
    if (exercise.measurement_type === 'BODYWEIGHT_REPS' && exercise.set_quality_mode !== 'BODYWEIGHT_REPS') fail(`${exercise.canonical_name}: BODYWEIGHT_REPS must use BODYWEIGHT_REPS`);
    if (exercise.measurement_type === 'DURATION' || exercise.measurement_type === 'OTHER') fail(`${exercise.canonical_name}: DURATION/OTHER must not be eligible in v1`);
  } else {
    excluded += 1;
    if (exercise.contributions.length !== 0) fail(`${exercise.canonical_name}: excluded row has contributions`);
    if (exercise.set_quality_mode !== 'NONE') fail(`${exercise.canonical_name}: excluded row must use NONE`);
  }

  if (exercise.primary_muscle_group === 'FULL_BODY' && exercise.volume_eligible) {
    fail(`${exercise.canonical_name}: FULL_BODY must remain excluded in muscle-volume-v1`);
  }
}

if (eligible !== 326) fail(`expected 326 eligible exercises, found ${eligible}`);
if (excluded !== 138) fail(`expected 138 excluded exercises, found ${excluded}`);

for (const addition of additions.exercises) {
  if (!names.has(addition.canonical_name)) fail(`missing Phase 19.3A exercise: ${addition.canonical_name}`);
}

const get = (name) => matrix.exercises.find((row) => row.canonical_name === name) ?? fail(`missing sentinel ${name}`);
const mapping = (name) => new Map(get(name).contributions.map((c) => [c.muscle_group, `${c.role}:${c.weight}`]));
const expect = (name, expected) => {
  const actual = mapping(name);
  const wanted = new Map(Object.entries(expected));
  if (actual.size !== wanted.size) fail(`${name}: unexpected contribution count`);
  for (const [muscle, value] of wanted) {
    if (actual.get(muscle) !== value) fail(`${name}: expected ${muscle}=${value}, found ${actual.get(muscle)}`);
  }
};

expect('Barbell Bench Press', {CHEST:'DIRECT:1', SHOULDERS:'INDIRECT:0.5', TRICEPS:'INDIRECT:0.5'});
expect('Dumbbell Close-Grip Bench Press', {TRICEPS:'DIRECT:1', CHEST:'INDIRECT:0.5', SHOULDERS:'INDIRECT:0.5'});
expect('Dumbbell Kickstand Romanian Deadlift', {HAMSTRINGS:'DIRECT:1', GLUTES:'DIRECT:1', BACK:'INDIRECT:0.5'});
expect('Dumbbell High Row', {BACK:'DIRECT:1', SHOULDERS:'DIRECT:1', BICEPS:'INDIRECT:0.5'});
expect('Dumbbell Russian Twist', {OBLIQUES:'DIRECT:1', CORE:'INDIRECT:0.5'});

for (const name of ['Dumbbell Clean','Dumbbell Snatch','Dumbbell Thruster','Dumbbell Devil Press']) {
  const row = get(name);
  if (row.volume_eligible || row.set_quality_mode !== 'NONE' || row.contributions.length !== 0) {
    fail(`${name}: FULL_BODY Phase 19.3A sentinel must remain excluded`);
  }
}

console.log('Phase 19.3A muscle-volume matrix: VALID');
console.log('Catalog rows: 464');
console.log('Volume eligible: 326');
console.log('Excluded/deferred: 138');
console.log('Phase 19.3A additions: 58');
console.log('Dumbbell catalogue target: 93');
console.log('Methodology: muscle-volume-v1');
