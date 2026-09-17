#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, "phase19-3-exercise-muscle-matrix.json");
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));

const fail = (message) => {
  console.error(`PHASE 19.3 MATRIX VALIDATION FAILED: ${message}`);
  process.exit(1);
};

const allowedGroups = new Set([
  "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "QUADS",
  "HAMSTRINGS", "GLUTES", "CALVES", "CORE", "OBLIQUES",
  "FOREARMS_GRIP", "NECK",
]);
const allowedConfidence = new Set(["HIGH", "MEDIUM", "LOW"]);
const allowedMeasurement = new Set(["WEIGHT_REPS", "BODYWEIGHT_REPS", "DURATION", "OTHER"]);
const allowedModes = new Set(["WEIGHT_EPLEY", "BODYWEIGHT_REPS", "NONE"]);

if (matrix.methodology_version !== "muscle-volume-v1") fail("unexpected methodology version");
if (matrix.phase !== "19.3") fail("unexpected phase");
if (!Array.isArray(matrix.exercises)) fail("exercises must be an array");
if (matrix.exercises.length !== 406) fail(`expected 406 exercises, found ${matrix.exercises.length}`);

const names = new Set();
let eligible = 0;
let excluded = 0;

for (const exercise of matrix.exercises) {
  if (!exercise.canonical_name) fail("exercise is missing canonical_name");
  if (names.has(exercise.canonical_name)) fail(`duplicate canonical_name: ${exercise.canonical_name}`);
  names.add(exercise.canonical_name);

  if (!allowedMeasurement.has(exercise.measurement_type)) {
    fail(`${exercise.canonical_name}: unexpected measurement_type ${exercise.measurement_type}`);
  }
  if (!allowedConfidence.has(exercise.mapping_confidence)) {
    fail(`${exercise.canonical_name}: unexpected mapping_confidence ${exercise.mapping_confidence}`);
  }
  if (!allowedModes.has(exercise.set_quality_mode)) {
    fail(`${exercise.canonical_name}: unexpected set_quality_mode ${exercise.set_quality_mode}`);
  }
  if (!Array.isArray(exercise.contributions)) {
    fail(`${exercise.canonical_name}: contributions must be an array`);
  }

  const seenMuscles = new Set();
  let directCount = 0;
  for (const contribution of exercise.contributions) {
    if (!allowedGroups.has(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: invalid reportable muscle ${contribution.muscle_group}`);
    }
    if (seenMuscles.has(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: duplicate muscle contribution ${contribution.muscle_group}`);
    }
    seenMuscles.add(contribution.muscle_group);

    if (contribution.role === "DIRECT") {
      directCount += 1;
      if (contribution.weight !== 1) fail(`${exercise.canonical_name}: DIRECT weight must be 1.0`);
    } else if (contribution.role === "INDIRECT") {
      if (contribution.weight !== 0.5) fail(`${exercise.canonical_name}: INDIRECT weight must be 0.5`);
    } else {
      fail(`${exercise.canonical_name}: invalid contribution role ${contribution.role}`);
    }
  }

  if (exercise.volume_eligible) {
    eligible += 1;
    if (exercise.contributions.length === 0) fail(`${exercise.canonical_name}: eligible exercise has no contributions`);
    if (directCount === 0) fail(`${exercise.canonical_name}: eligible exercise has no DIRECT contribution`);
    if (exercise.measurement_type === "WEIGHT_REPS" && exercise.set_quality_mode !== "WEIGHT_EPLEY") {
      fail(`${exercise.canonical_name}: WEIGHT_REPS eligible exercise must use WEIGHT_EPLEY`);
    }
    if (exercise.measurement_type === "BODYWEIGHT_REPS" && exercise.set_quality_mode !== "BODYWEIGHT_REPS") {
      fail(`${exercise.canonical_name}: BODYWEIGHT_REPS eligible exercise must use BODYWEIGHT_REPS`);
    }
    if (exercise.measurement_type === "DURATION" || exercise.measurement_type === "OTHER") {
      fail(`${exercise.canonical_name}: DURATION/OTHER must not be eligible in v1`);
    }
  } else {
    excluded += 1;
    if (exercise.contributions.length !== 0) fail(`${exercise.canonical_name}: excluded exercise has contributions`);
    if (exercise.set_quality_mode !== "NONE") fail(`${exercise.canonical_name}: excluded exercise must use NONE mode`);
  }

  if (exercise.primary_muscle_group === "FULL_BODY" && exercise.volume_eligible) {
    fail(`${exercise.canonical_name}: FULL_BODY exercise must be excluded in muscle-volume-v1`);
  }
}

if (eligible !== 276) fail(`expected 276 eligible exercises, found ${eligible}`);
if (excluded !== 130) fail(`expected 130 excluded exercises, found ${excluded}`);
if (matrix.catalog_count !== 406 || matrix.eligible_count !== 276 || matrix.excluded_count !== 130) {
  fail("matrix metadata counts do not match locked Phase 19.3 counts");
}

const get = (name) => {
  const exercise = matrix.exercises.find((row) => row.canonical_name === name);
  if (!exercise) fail(`missing sentinel exercise ${name}`);
  return exercise;
};
const contributionMap = (exercise) => new Map(
  exercise.contributions.map((c) => [c.muscle_group, `${c.role}:${c.weight}`])
);
const expectMapping = (name, expected) => {
  const actual = contributionMap(get(name));
  const wanted = new Map(Object.entries(expected));
  if (actual.size !== wanted.size) fail(`${name}: unexpected contribution count`);
  for (const [muscle, value] of wanted) {
    if (actual.get(muscle) !== value) fail(`${name}: expected ${muscle}=${value}, found ${actual.get(muscle)}`);
  }
};

expectMapping("Barbell Bench Press", {
  CHEST: "DIRECT:1",
  SHOULDERS: "INDIRECT:0.5",
  TRICEPS: "INDIRECT:0.5",
});
expectMapping("Barbell Row", {
  BACK: "DIRECT:1",
  BICEPS: "INDIRECT:0.5",
});
expectMapping("Back Squat", {
  QUADS: "DIRECT:1",
  GLUTES: "INDIRECT:0.5",
});
expectMapping("Romanian Deadlift", {
  BACK: "INDIRECT:0.5",
  HAMSTRINGS: "DIRECT:1",
  GLUTES: "DIRECT:1",
});
expectMapping("Close-Grip Barbell Bench Press", {
  CHEST: "INDIRECT:0.5",
  SHOULDERS: "INDIRECT:0.5",
  TRICEPS: "DIRECT:1",
});

for (const excludedName of [
  "Cable Hip Adduction",
  "Hip Adduction Machine",
  "Tibialis Raise",
  "Weighted Tibialis Raise",
  "Cable External Rotation",
  "Cable Internal Rotation",
  "Dumbbell Push Press",
  "Kettlebell Push Press",
  "Push Press",
]) {
  if (get(excludedName).volume_eligible) fail(`${excludedName}: expected v1 exclusion`);
}

console.log("Phase 19.3 muscle-volume matrix: VALID");
console.log(`Catalog rows: ${matrix.exercises.length}`);
console.log(`Volume eligible: ${eligible}`);
console.log(`Excluded/deferred: ${excluded}`);
console.log(`Methodology: ${matrix.methodology_version}`);
