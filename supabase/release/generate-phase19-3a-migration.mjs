#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const additionsPath = path.join(here, 'phase19-3a-exercise-additions.json');
const target = process.argv[2];

if (!target) {
  console.error('Usage: node generate-phase19-3a-migration.mjs <target migration path>');
  process.exit(1);
}
if (!fs.existsSync(additionsPath)) {
  console.error(`Missing additions artifact: ${additionsPath}`);
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.error(`Migration target does not exist: ${target}`);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(additionsPath, 'utf8'));
if (artifact.phase !== '19.3A' || artifact.additions_count !== 58) {
  throw new Error('Unexpected Phase 19.3A additions artifact metadata.');
}
if (!Array.isArray(artifact.exercises) || artifact.exercises.length !== 58) {
  throw new Error('Expected exactly 58 Phase 19.3A exercises.');
}

const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlArray = (values) => values.length
  ? `array[${values.map(sqlText).join(',')}]::text[]`
  : 'array[]::text[]';

const names = artifact.exercises.map((row) => row.canonical_name);
const rows = artifact.exercises.map((row) =>
  `  (${sqlText(row.canonical_name)},${sqlText(row.measurement_type)},${sqlText(row.primary_muscle_group)},${sqlText(row.workout_type)},${sqlArray(row.aliases)},true)`
).join(',\n');

const sql = `-- Phase 19.3A: Exercise Catalogue Expansion II.\n-- Adds 58 useful dumbbell exercises without adding picker categories or equipment hierarchies.\n-- The corresponding muscle-volume mapping decisions live in\n-- supabase/release/phase19-3a-exercise-additions.json and are merged into the\n-- existing Phase 19.3 matrix by update-phase19-3a-matrix.mjs.\n\ndo $$\nbegin\n  if (select count(*) from public.exercise_catalog where active = true) <> 406 then\n    raise exception 'Phase 19.3A expected 406 active catalogue rows before expansion';\n  end if;\n\n  if (select count(*) from public.exercise_catalog where active = true and workout_type = 'DUMBBELL') <> 35 then\n    raise exception 'Phase 19.3A expected 35 active dumbbell catalogue rows before expansion';\n  end if;\n\n  if exists (\n    select 1\n    from public.exercise_catalog\n    where canonical_name = any(array[${names.map(sqlText).join(',')}]::text[])\n  ) then\n    raise exception 'Phase 19.3A canonical-name collision detected; stop and review instead of silently skipping';\n  end if;\nend\n$$;\n\ninsert into public.exercise_catalog\n  (canonical_name, measurement_type, primary_muscle_group, workout_type, aliases, active)\nvalues\n${rows};\n\ndo $$\nbegin\n  if (select count(*) from public.exercise_catalog where active = true) <> 464 then\n    raise exception 'Phase 19.3A expected 464 active catalogue rows after expansion';\n  end if;\n\n  if (select count(*) from public.exercise_catalog where active = true and workout_type = 'DUMBBELL') <> 93 then\n    raise exception 'Phase 19.3A expected 93 active dumbbell catalogue rows after expansion';\n  end if;\nend\n$$;\n`;

fs.writeFileSync(target, sql, 'utf8');
console.log('Phase 19.3A migration generated successfully.');
console.log(`Migration: ${path.resolve(target)}`);
console.log(`Exercise additions: ${artifact.additions_count}`);
console.log(`Dumbbell catalogue: ${artifact.dumbbell_base_count} -> ${artifact.dumbbell_result_count}`);
console.log(`Expected active catalogue: ${artifact.catalog_base_count} -> ${artifact.expected_result.catalog_count}`);
