#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(here, "phase19-3-exercise-muscle-matrix.json");
const migrationPathArg = process.argv[2];

const fail = (message) => {
  console.error(`PHASE 19.4 GENERATOR FAILED: ${message}`);
  process.exit(1);
};

if (!migrationPathArg) {
  fail("pass the CLI-created migration path as the first argument");
}

const migrationPath = path.resolve(process.cwd(), migrationPathArg);
const migrationName = path.basename(migrationPath);

if (!/^\d{14}_phase19_4_volume_foundation\.sql$/.test(migrationName)) {
  fail(`unexpected migration filename: ${migrationName}`);
}

if (!fs.existsSync(migrationPath)) {
  fail(`migration file does not exist: ${migrationPath}`);
}

if (fs.readFileSync(migrationPath, "utf8").trim().length !== 0) {
  fail("migration file is not empty; refusing to overwrite it");
}

if (!fs.existsSync(matrixPath)) {
  fail(`missing matrix: ${matrixPath}`);
}

const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));

const REPORTABLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "CORE",
  "OBLIQUES",
  "FOREARMS_GRIP",
  "NECK",
];

const BENCHMARKS_7D = [
  ["CHEST", 10, 14, 18, 20, "MODERATE"],
  ["BACK", 12, 16, 20, 22, "MODERATE"],
  ["SHOULDERS", 10, 12, 16, 18, "MODERATE"],
  ["BICEPS", 10, 12, 16, 18, "HIGH"],
  ["TRICEPS", 12, 16, 20, 22, "HIGH"],
  ["QUADS", 12, 14, 18, 20, "HIGH"],
  ["HAMSTRINGS", 10, 12, 16, 18, "MODERATE_LOW"],
  ["GLUTES", 10, 12, 16, 18, "MODERATE"],
  ["CALVES", 10, 12, 16, 18, "MODERATE_HIGH"],
  ["FOREARMS_GRIP", 6, 8, 12, 14, "LOW"],
  ["CORE", 6, 8, 12, 14, "LOW"],
  ["OBLIQUES", 4, 6, 10, 12, "LOW"],
  ["NECK", 6, 7, 9, 10, "LOW_MODERATE"],
];

const expectedCounts = {
  catalog: 464,
  eligible: 326,
  excluded: 138,
  contributions: 604,
  quality: {
    NONE: 138,
    WEIGHT_EPLEY: 281,
    BODYWEIGHT_REPS: 45,
  },
  confidence: {
    HIGH: 334,
    MEDIUM: 129,
    LOW: 1,
  },
};

const sameArray = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

if (matrix.methodology_version !== "muscle-volume-v1") {
  fail(`unexpected methodology version: ${matrix.methodology_version}`);
}
if (matrix.phase !== "19.3A") {
  fail(`expected matrix phase 19.3A, found ${matrix.phase}`);
}
if (!Array.isArray(matrix.exercises) || matrix.exercises.length !== expectedCounts.catalog) {
  fail(`expected ${expectedCounts.catalog} matrix rows`);
}
if (
  matrix.catalog_count !== expectedCounts.catalog ||
  matrix.eligible_count !== expectedCounts.eligible ||
  matrix.excluded_count !== expectedCounts.excluded
) {
  fail("matrix metadata counts do not match Phase 19.3A");
}
if (!sameArray(matrix.reportable_muscle_groups ?? [], REPORTABLE_GROUPS)) {
  fail("reportable muscle groups differ from the locked Phase 19.4 contract");
}
if (
  matrix.contribution_weights?.DIRECT !== 1 ||
  matrix.contribution_weights?.INDIRECT !== 0.5
) {
  fail("matrix contribution weights differ from DIRECT=1 / INDIRECT=0.5");
}

const names = new Set();
const qualityCounts = {};
const confidenceCounts = {};
let eligibleCount = 0;
let excludedCount = 0;
let contributionCount = 0;

for (const exercise of matrix.exercises) {
  if (!exercise.canonical_name || names.has(exercise.canonical_name)) {
    fail(`missing/duplicate canonical name: ${exercise.canonical_name}`);
  }
  names.add(exercise.canonical_name);

  qualityCounts[exercise.set_quality_mode] =
    (qualityCounts[exercise.set_quality_mode] ?? 0) + 1;
  confidenceCounts[exercise.mapping_confidence] =
    (confidenceCounts[exercise.mapping_confidence] ?? 0) + 1;

  if (!["HIGH", "MEDIUM", "LOW"].includes(exercise.mapping_confidence)) {
    fail(`${exercise.canonical_name}: invalid mapping confidence`);
  }
  if (!["WEIGHT_EPLEY", "BODYWEIGHT_REPS", "NONE"].includes(exercise.set_quality_mode)) {
    fail(`${exercise.canonical_name}: invalid set-quality mode`);
  }
  if (typeof exercise.review_flag !== "boolean") {
    fail(`${exercise.canonical_name}: review_flag must be boolean`);
  }
  if (!exercise.rationale?.trim()) {
    fail(`${exercise.canonical_name}: rationale is required`);
  }

  const contributions = exercise.contributions ?? [];
  contributionCount += contributions.length;

  const seenMuscles = new Set();
  let directCount = 0;

  for (const contribution of contributions) {
    if (!REPORTABLE_GROUPS.includes(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: invalid muscle ${contribution.muscle_group}`);
    }
    if (seenMuscles.has(contribution.muscle_group)) {
      fail(`${exercise.canonical_name}: duplicate muscle ${contribution.muscle_group}`);
    }
    seenMuscles.add(contribution.muscle_group);

    if (contribution.role === "DIRECT") {
      directCount += 1;
      if (contribution.weight !== 1) {
        fail(`${exercise.canonical_name}: DIRECT weight must be 1`);
      }
    } else if (contribution.role === "INDIRECT") {
      if (contribution.weight !== 0.5) {
        fail(`${exercise.canonical_name}: INDIRECT weight must be 0.5`);
      }
    } else {
      fail(`${exercise.canonical_name}: invalid contribution role`);
    }
  }

  if (exercise.volume_eligible) {
    eligibleCount += 1;
    if (exercise.set_quality_mode === "NONE") {
      fail(`${exercise.canonical_name}: eligible exercise cannot use NONE`);
    }
    if (directCount < 1) {
      fail(`${exercise.canonical_name}: eligible exercise requires a DIRECT contribution`);
    }
  } else {
    excludedCount += 1;
    if (exercise.set_quality_mode !== "NONE" || contributions.length !== 0) {
      fail(`${exercise.canonical_name}: excluded exercise must use NONE with no contributions`);
    }
  }
}

if (eligibleCount !== expectedCounts.eligible || excludedCount !== expectedCounts.excluded) {
  fail("eligible/excluded counts do not match the locked Phase 19.3A matrix");
}
if (contributionCount !== expectedCounts.contributions) {
  fail(`expected ${expectedCounts.contributions} contributions, found ${contributionCount}`);
}
for (const [mode, expected] of Object.entries(expectedCounts.quality)) {
  if ((qualityCounts[mode] ?? 0) !== expected) {
    fail(`expected ${expected} ${mode} rows, found ${qualityCounts[mode] ?? 0}`);
  }
}
for (const [confidence, expected] of Object.entries(expectedCounts.confidence)) {
  if ((confidenceCounts[confidence] ?? 0) !== expected) {
    fail(
      `expected ${expected} ${confidence} mapping-confidence rows, found ${
        confidenceCounts[confidence] ?? 0
      }`,
    );
  }
}

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const b = (value) => (value ? "true" : "false");
const n = (value) => Number(value).toString();

const ruleValues = matrix.exercises
  .map(
    (exercise) =>
      `  (${q(exercise.canonical_name)}, ${b(exercise.volume_eligible)}, ${q(
        exercise.set_quality_mode,
      )}, ${q(exercise.mapping_confidence)}, ${b(exercise.review_flag)}, ${q(
        exercise.rationale,
      )})`,
  )
  .join(",\n");

const contributionValues = matrix.exercises
  .flatMap((exercise) =>
    exercise.contributions.map(
      (contribution) =>
        `  (${q(exercise.canonical_name)}, ${q(contribution.muscle_group)}, ${q(
          contribution.role,
        )}, ${n(contribution.weight)})`,
    ),
  )
  .join(",\n");

const benchmarkValues = BENCHMARKS_7D.flatMap(
  ([muscle, min, midpoint, max, high, confidence]) => [
    `  ('muscle-volume-v1', ${q(muscle)}, 7, ${n(min)}, ${n(midpoint)}, ${n(max)}, ${n(
      high,
    )}, ${q(confidence)})`,
    `  ('muscle-volume-v1', ${q(muscle)}, 28, ${n(min * 4)}, ${n(midpoint * 4)}, ${n(
      max * 4,
    )}, ${n(high * 4)}, ${q(confidence)})`,
  ],
).join(",\n");

const sql = `-- Phase 19.4: versioned muscle-volume database foundation.
-- Generated from the reviewed Phase 19.3A matrix.
-- Do not infer contribution mappings from exercise names or primary_muscle_group.

do $$
begin
  if (select count(*) from public.exercise_catalog where active = true) <> 464 then
    raise exception 'Phase 19.4 expected 464 active exercise_catalog rows';
  end if;
end
$$;

create table public.muscle_volume_methodologies (
  version text primary key,
  is_active boolean not null default false,
  weighted_baseline_formula text not null,
  bodyweight_baseline_formula text not null,
  baseline_window_days smallint not null,
  baseline_established_min_sessions smallint not null,
  high_confidence_min_sessions smallint not null,
  high_confidence_recent_days smallint not null,
  epley_confidence_downgrade_from_reps smallint not null,
  epley_max_reps smallint not null,
  full_credit_min_ratio numeric(5,4) not null,
  partial_credit_min_ratio numeric(5,4) not null,
  single_rep_credit_cap numeric(5,4) not null,
  over_max_reps_credit_cap numeric(5,4) not null,
  failure_full_credit_min_reps smallint not null,
  provisional_full_credit_min_reps smallint not null,
  provisional_full_credit_max_reps smallint not null,
  drop_continuation_credit numeric(5,4) not null,
  drop_max_multiplier numeric(5,4) not null,
  drop_min_continuation_reps smallint not null,
  drop_requires_lower_load boolean not null,
  drop_requires_contiguous_segments boolean not null,
  pyramid_stages_independent boolean not null,
  superset_multiplier numeric(5,4) not null,
  low_status_fraction_of_target_min numeric(5,4) not null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  notes text not null,

  constraint muscle_volume_methodologies_version_nonempty
    check (char_length(trim(version)) between 3 and 64),
  constraint muscle_volume_methodologies_weighted_formula
    check (weighted_baseline_formula in ('EPLEY')),
  constraint muscle_volume_methodologies_bodyweight_formula
    check (bodyweight_baseline_formula in ('BEST_REPS')),
  constraint muscle_volume_methodologies_baseline_window
    check (baseline_window_days > 0),
  constraint muscle_volume_methodologies_session_counts
    check (
      baseline_established_min_sessions >= 1
      and high_confidence_min_sessions >= baseline_established_min_sessions
    ),
  constraint muscle_volume_methodologies_recent_window
    check (high_confidence_recent_days between 1 and baseline_window_days),
  constraint muscle_volume_methodologies_epley_reps
    check (
      epley_confidence_downgrade_from_reps >= 2
      and epley_confidence_downgrade_from_reps <= epley_max_reps
      and epley_max_reps >= 2
    ),
  constraint muscle_volume_methodologies_credit_ratios
    check (
      full_credit_min_ratio > 0
      and full_credit_min_ratio <= 1
      and partial_credit_min_ratio >= 0
      and partial_credit_min_ratio < full_credit_min_ratio
      and single_rep_credit_cap between 0 and 1
      and over_max_reps_credit_cap between 0 and 1
    ),
  constraint muscle_volume_methodologies_provisional_reps
    check (
      failure_full_credit_min_reps >= 2
      and provisional_full_credit_min_reps >= 2
      and provisional_full_credit_max_reps >= provisional_full_credit_min_reps
    ),
  constraint muscle_volume_methodologies_drop_rules
    check (
      drop_continuation_credit >= 0
      and drop_continuation_credit <= 1
      and drop_max_multiplier >= 1
      and drop_min_continuation_reps >= 1
    ),
  constraint muscle_volume_methodologies_superset_multiplier
    check (superset_multiplier > 0),
  constraint muscle_volume_methodologies_low_status_fraction
    check (low_status_fraction_of_target_min > 0 and low_status_fraction_of_target_min < 1),
  constraint muscle_volume_methodologies_active_timestamp
    check (not is_active or activated_at is not null)
);

create unique index muscle_volume_methodologies_single_active_idx
  on public.muscle_volume_methodologies (is_active)
  where is_active;

create table public.muscle_volume_exercise_rules (
  methodology_version text not null
    references public.muscle_volume_methodologies(version)
    on update restrict on delete restrict,
  exercise_id uuid not null
    references public.exercise_catalog(id)
    on update restrict on delete restrict,
  volume_eligible boolean not null,
  set_quality_mode text not null,
  mapping_confidence text not null,
  review_flag boolean not null default false,
  rationale text not null,
  created_at timestamptz not null default now(),

  primary key (methodology_version, exercise_id),

  constraint muscle_volume_exercise_rules_quality_mode
    check (set_quality_mode in ('WEIGHT_EPLEY', 'BODYWEIGHT_REPS', 'NONE')),
  constraint muscle_volume_exercise_rules_mapping_confidence
    check (mapping_confidence in ('HIGH', 'MEDIUM', 'LOW')),
  constraint muscle_volume_exercise_rules_eligibility_mode
    check (
      (volume_eligible and set_quality_mode in ('WEIGHT_EPLEY', 'BODYWEIGHT_REPS'))
      or
      (not volume_eligible and set_quality_mode = 'NONE')
    ),
  constraint muscle_volume_exercise_rules_rationale
    check (char_length(trim(rationale)) > 0)
);

create table public.muscle_volume_exercise_contributions (
  methodology_version text not null,
  exercise_id uuid not null,
  muscle_group text not null,
  contribution_role text not null,
  contribution_weight numeric(4,2) not null,
  created_at timestamptz not null default now(),

  primary key (methodology_version, exercise_id, muscle_group),

  foreign key (methodology_version, exercise_id)
    references public.muscle_volume_exercise_rules(methodology_version, exercise_id)
    on update restrict on delete restrict,

  constraint muscle_volume_contributions_group
    check (muscle_group in (
      'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS',
      'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'OBLIQUES',
      'FOREARMS_GRIP', 'NECK'
    )),
  constraint muscle_volume_contributions_role
    check (contribution_role in ('DIRECT', 'INDIRECT')),
  constraint muscle_volume_contributions_weight
    check (
      (contribution_role = 'DIRECT' and contribution_weight = 1.00)
      or
      (contribution_role = 'INDIRECT' and contribution_weight = 0.50)
    )
);

create table public.muscle_volume_benchmarks (
  methodology_version text not null
    references public.muscle_volume_methodologies(version)
    on update restrict on delete restrict,
  muscle_group text not null,
  window_days smallint not null,
  target_min numeric(6,2) not null,
  target_midpoint numeric(6,2) not null,
  target_max numeric(6,2) not null,
  high_review_above numeric(6,2) not null,
  evidence_confidence text not null,
  created_at timestamptz not null default now(),

  primary key (methodology_version, muscle_group, window_days),

  constraint muscle_volume_benchmarks_group
    check (muscle_group in (
      'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS',
      'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'OBLIQUES',
      'FOREARMS_GRIP', 'NECK'
    )),
  constraint muscle_volume_benchmarks_window
    check (window_days > 0),
  constraint muscle_volume_benchmarks_ranges
    check (
      target_min >= 0
      and target_midpoint >= target_min
      and target_midpoint <= target_max
      and target_max >= target_min
      and high_review_above > target_max
    ),
  constraint muscle_volume_benchmarks_confidence
    check (evidence_confidence in (
      'HIGH', 'MODERATE_HIGH', 'MODERATE', 'MODERATE_LOW',
      'LOW_MODERATE', 'LOW'
    ))
);

insert into public.muscle_volume_methodologies (
  version,
  is_active,
  weighted_baseline_formula,
  bodyweight_baseline_formula,
  baseline_window_days,
  baseline_established_min_sessions,
  high_confidence_min_sessions,
  high_confidence_recent_days,
  epley_confidence_downgrade_from_reps,
  epley_max_reps,
  full_credit_min_ratio,
  partial_credit_min_ratio,
  single_rep_credit_cap,
  over_max_reps_credit_cap,
  failure_full_credit_min_reps,
  provisional_full_credit_min_reps,
  provisional_full_credit_max_reps,
  drop_continuation_credit,
  drop_max_multiplier,
  drop_min_continuation_reps,
  drop_requires_lower_load,
  drop_requires_contiguous_segments,
  pyramid_stages_independent,
  superset_multiplier,
  low_status_fraction_of_target_min,
  activated_at,
  notes
)
values (
  'muscle-volume-v1',
  true,
  'EPLEY',
  'BEST_REPS',
  180,
  2,
  3,
  90,
  13,
  30,
  0.90,
  0.80,
  0.50,
  0.50,
  2,
  2,
  30,
  0.50,
  2.00,
  2,
  true,
  true,
  true,
  1.00,
  0.50,
  now(),
  'Phase 19.2 muscle-volume-v1 methodology. Version owns baseline, set-quality, advanced-set, contribution, benchmark, and status interpretation.'
);

create temporary table phase19_4_exercise_rule_seed (
  canonical_name text primary key,
  volume_eligible boolean not null,
  set_quality_mode text not null,
  mapping_confidence text not null,
  review_flag boolean not null,
  rationale text not null
) on commit drop;

insert into phase19_4_exercise_rule_seed (
  canonical_name,
  volume_eligible,
  set_quality_mode,
  mapping_confidence,
  review_flag,
  rationale
)
values
${ruleValues};

do $$
begin
  if (select count(*) from phase19_4_exercise_rule_seed) <> 464 then
    raise exception 'Phase 19.4 expected 464 seed rule rows';
  end if;

  if (
    select count(*)
    from phase19_4_exercise_rule_seed s
    join public.exercise_catalog e
      on e.canonical_name = s.canonical_name
     and e.active = true
  ) <> 464 then
    raise exception 'Phase 19.4 could not resolve every matrix canonical name to one active exercise_catalog row';
  end if;
end
$$;

insert into public.muscle_volume_exercise_rules (
  methodology_version,
  exercise_id,
  volume_eligible,
  set_quality_mode,
  mapping_confidence,
  review_flag,
  rationale
)
select
  'muscle-volume-v1',
  e.id,
  s.volume_eligible,
  s.set_quality_mode,
  s.mapping_confidence,
  s.review_flag,
  s.rationale
from phase19_4_exercise_rule_seed s
join public.exercise_catalog e
  on e.canonical_name = s.canonical_name
 and e.active = true
order by s.canonical_name;

create temporary table phase19_4_contribution_seed (
  canonical_name text not null,
  muscle_group text not null,
  contribution_role text not null,
  contribution_weight numeric(4,2) not null,
  primary key (canonical_name, muscle_group)
) on commit drop;

insert into phase19_4_contribution_seed (
  canonical_name,
  muscle_group,
  contribution_role,
  contribution_weight
)
values
${contributionValues};

do $$
begin
  if (select count(*) from phase19_4_contribution_seed) <> 604 then
    raise exception 'Phase 19.4 expected 604 contribution seed rows';
  end if;

  if exists (
    select 1
    from phase19_4_contribution_seed c
    join phase19_4_exercise_rule_seed r using (canonical_name)
    where r.volume_eligible = false
  ) then
    raise exception 'Phase 19.4 contribution seed contains an excluded exercise';
  end if;
end
$$;

insert into public.muscle_volume_exercise_contributions (
  methodology_version,
  exercise_id,
  muscle_group,
  contribution_role,
  contribution_weight
)
select
  'muscle-volume-v1',
  e.id,
  c.muscle_group,
  c.contribution_role,
  c.contribution_weight
from phase19_4_contribution_seed c
join public.exercise_catalog e
  on e.canonical_name = c.canonical_name
 and e.active = true
order by c.canonical_name, c.muscle_group;

insert into public.muscle_volume_benchmarks (
  methodology_version,
  muscle_group,
  window_days,
  target_min,
  target_midpoint,
  target_max,
  high_review_above,
  evidence_confidence
)
values
${benchmarkValues};

do $$
begin
  if (select count(*) from public.muscle_volume_exercise_rules where methodology_version = 'muscle-volume-v1') <> 464 then
    raise exception 'Phase 19.4 expected 464 persisted exercise rules';
  end if;

  if (select count(*) from public.muscle_volume_exercise_rules where methodology_version = 'muscle-volume-v1' and volume_eligible) <> 326 then
    raise exception 'Phase 19.4 expected 326 eligible persisted exercise rules';
  end if;

  if (select count(*) from public.muscle_volume_exercise_rules where methodology_version = 'muscle-volume-v1' and not volume_eligible) <> 138 then
    raise exception 'Phase 19.4 expected 138 excluded persisted exercise rules';
  end if;

  if (select count(*) from public.muscle_volume_exercise_contributions where methodology_version = 'muscle-volume-v1') <> 604 then
    raise exception 'Phase 19.4 expected 604 persisted contribution rows';
  end if;

  if (select count(*) from public.muscle_volume_benchmarks where methodology_version = 'muscle-volume-v1') <> 26 then
    raise exception 'Phase 19.4 expected 26 benchmark rows';
  end if;

  if exists (
    select 1
    from public.muscle_volume_exercise_rules r
    where r.methodology_version = 'muscle-volume-v1'
      and r.volume_eligible
      and not exists (
        select 1
        from public.muscle_volume_exercise_contributions c
        where c.methodology_version = r.methodology_version
          and c.exercise_id = r.exercise_id
          and c.contribution_role = 'DIRECT'
      )
  ) then
    raise exception 'Phase 19.4 found an eligible exercise without a DIRECT contribution';
  end if;

  if exists (
    select 1
    from public.muscle_volume_exercise_rules r
    join public.muscle_volume_exercise_contributions c
      on c.methodology_version = r.methodology_version
     and c.exercise_id = r.exercise_id
    where r.methodology_version = 'muscle-volume-v1'
      and not r.volume_eligible
  ) then
    raise exception 'Phase 19.4 found contributions for an excluded exercise';
  end if;
end
$$;

alter table public.muscle_volume_methodologies enable row level security;
alter table public.muscle_volume_exercise_rules enable row level security;
alter table public.muscle_volume_exercise_contributions enable row level security;
alter table public.muscle_volume_benchmarks enable row level security;

revoke all on table
  public.muscle_volume_methodologies,
  public.muscle_volume_exercise_rules,
  public.muscle_volume_exercise_contributions,
  public.muscle_volume_benchmarks
from public, anon, authenticated;

grant select on table
  public.muscle_volume_methodologies,
  public.muscle_volume_exercise_rules,
  public.muscle_volume_exercise_contributions,
  public.muscle_volume_benchmarks
to authenticated;

create policy muscle_volume_methodologies_select_authenticated
on public.muscle_volume_methodologies
for select
to authenticated
using (true);

create policy muscle_volume_exercise_rules_select_authenticated
on public.muscle_volume_exercise_rules
for select
to authenticated
using (true);

create policy muscle_volume_exercise_contributions_select_authenticated
on public.muscle_volume_exercise_contributions
for select
to authenticated
using (true);

create policy muscle_volume_benchmarks_select_authenticated
on public.muscle_volume_benchmarks
for select
to authenticated
using (true);

comment on table public.muscle_volume_methodologies is
  'Versioned muscle-volume methodology parameters. Browser roles may read but never author methodology state.';
comment on table public.muscle_volume_exercise_rules is
  'Versioned eligibility, set-quality mode, confidence, review flag, and rationale for every reviewed canonical exercise.';
comment on table public.muscle_volume_exercise_contributions is
  'Versioned direct/indirect exercise-to-muscle contribution weights for volume-eligible exercises.';
comment on table public.muscle_volume_benchmarks is
  'Versioned 7-day/28-day muscle-volume target and high-review benchmark bands.';

notify pgrst, 'reload schema';
`;

fs.writeFileSync(migrationPath, sql, "utf8");

console.log("");
console.log("Phase 19.4 migration generated.");
console.log(`Migration: ${migrationName}`);
console.log(`Methodology: ${matrix.methodology_version}`);
console.log(`Exercise rules: ${matrix.exercises.length}`);
console.log(`Volume eligible: ${eligibleCount}`);
console.log(`Excluded/deferred: ${excludedCount}`);
console.log(`Contribution rows: ${contributionCount}`);
console.log(`Benchmark rows: ${BENCHMARKS_7D.length * 2}`);
console.log("RLS: authenticated read-only; anon has no table privileges");
