#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const auditPath = path.join(here, 'phase20-1-equipment-loggability-audit.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

const fail = (message) => {
  console.error(`PHASE 20.1 EQUIPMENT AUDIT FAILED: ${message}`);
  process.exit(1);
};

if (audit.phase !== '20.1') fail(`expected phase 20.1, found ${audit.phase}`);
if (audit.catalog_count !== 568) fail(`expected 568 active exercises, found ${audit.catalog_count}`);
if (audit.program_loggable_count !== 512) fail(`expected 512 program-loggable exercises, found ${audit.program_loggable_count}`);

const activeTotal = audit.workout_types.reduce((sum, row) => sum + row.active_count, 0);
const loggableTotal = audit.workout_types.reduce((sum, row) => sum + row.program_loggable_count, 0);
if (activeTotal !== 568) fail(`workout-type active total is ${activeTotal}`);
if (loggableTotal !== 512) fail(`workout-type loggable total is ${loggableTotal}`);

const byType = new Map(audit.workout_types.map((row) => [row.workout_type, row]));
const expectCounts = (type, active, loggable) => {
  const row = byType.get(type);
  if (!row) fail(`missing workout type ${type}`);
  if (row.active_count !== active || row.program_loggable_count !== loggable) {
    fail(`${type} expected ${active}/${loggable}, found ${row.active_count}/${row.program_loggable_count}`);
  }
};

expectCounts('BAND', 15, 0);
expectCounts('MEDICINE_BALL', 8, 0);
expectCounts('ISOMETRIC', 9, 0);
expectCounts('KETTLEBELL', 53, 49);
expectCounts('MACHINE', 89, 87);
expectCounts('PLYOMETRIC', 35, 34);
expectCounts('SPECIALTY', 32, 28);
expectCounts('STRONGMAN_CARRY_SLED', 22, 9);

console.log('Phase 20.1 equipment loggability audit: VALID');
console.log('Active catalogue: 568');
console.log('Program-loggable: 512');
console.log('Deferred by measurement/logging model: 56');
console.log('Bands: 0/15 generator-loggable (profile-only in v1)');
