#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, 'phase19-3-exercise-muscle-matrix.json');
const additionsPath = path.join(here, 'phase19-3a-exercise-additions.json');

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const additions = JSON.parse(fs.readFileSync(additionsPath, 'utf8'));

if (
  matrix.phase !== '19.3' ||
  matrix.catalog_count !== 406 ||
  matrix.eligible_count !== 276 ||
  matrix.excluded_count !== 130
) {
  throw new Error('Expected the clean locked Phase 19.3 matrix (406 / 276 / 130). STOP.');
}
if (matrix.methodology_version !== 'muscle-volume-v1') {
  throw new Error('Unexpected methodology version. STOP.');
}
if (additions.phase !== '19.3A' || additions.exercises.length !== 58) {
  throw new Error('Unexpected Phase 19.3A additions artifact. STOP.');
}

const existing = new Set(matrix.exercises.map((row) => row.canonical_name));
for (const row of additions.exercises) {
  if (existing.has(row.canonical_name)) {
    throw new Error(`Matrix collision: ${row.canonical_name}`);
  }
}

const toMatrixRow = ({ aliases, ...row }) => row;
matrix.exercises.push(...additions.exercises.map(toMatrixRow));
matrix.exercises.sort((a, b) =>
  a.primary_muscle_group.localeCompare(b.primary_muscle_group, 'en') ||
  a.workout_type.localeCompare(b.workout_type, 'en') ||
  a.canonical_name.localeCompare(b.canonical_name, 'en')
);

matrix.phase = '19.3A';
matrix.catalog_snapshot_date = '2026-09-18';
matrix.catalog_count = additions.expected_result.catalog_count;
matrix.eligible_count = additions.expected_result.eligible_count;
matrix.excluded_count = additions.expected_result.excluded_count;

const note = 'Phase 19.3A expands the catalogue with 58 dumbbell exercises and refreshes this same versioned matrix to 464 canonical exercises; 50 new rows are volume-eligible and 8 FULL_BODY dumbbell patterns remain explicitly excluded.';
if (!Array.isArray(matrix.notes)) matrix.notes = [];
if (!matrix.notes.includes(note)) matrix.notes.push(note);

fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
console.log('Phase 19.3A matrix refresh complete.');
console.log(`Catalog rows: ${matrix.catalog_count}`);
console.log(`Volume eligible: ${matrix.eligible_count}`);
console.log(`Excluded/deferred: ${matrix.excluded_count}`);
