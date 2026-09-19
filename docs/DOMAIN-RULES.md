# Domain Rules — Source of Truth

This document defines the locked **v0.3 / `lifting-v1`** scoring model and the Phase 19 muscle-volume analytics contract. Tests and persistence code may be more detailed, but they must not contradict these rules.

## Product identity

The app is a **lifting-progression game**.

Lifting is the primary scored activity. Cardio can earn a small accessory bonus, but cardio does not replace lifting, satisfy the weekly lifting target, or use the lifting progression model.

The daily scoring layers are:

| Layer | Rule | Daily max |
|---|---|---:|
| Lifting workout XP | 50 XP when at least one lifting workout qualifies | 50 |
| Exercise completion XP | 5 XP per qualifying canonical exercise, up to 6 exercises | 30 |
| Exercise progression XP | 5/10/15 XP per improved exercise, summed across exercises | 30 |
| Cardio bonus XP | best eligible cardio duration tier of the day | 15 |
| **Total** | sum of the four layers | **125** |

`scoring_version = lifting-v1` is stored with authoritative scoring events so future tuning does not silently reinterpret old awards.

## 1. Lifting workout XP

A lifting session qualifies when all are true:

- category is `STRENGTH`;
- status is `COMPLETED`;
- active duration is at least 15 minutes;
- at least 4 completed `WORKING` sets have at least 1 rep;
- active duration is not greater than 6 hours / review-required.

A scoring date with one or more qualifying lifting workouts earns **50 lifting-workout XP total**.

Additional same-day lifting sessions may be stored, but they do not stack another 50 XP.

Warmups do not count toward qualification. Weight is not required for bodyweight working sets.

## 2. Exercise completion XP

A canonical exercise earns **5 XP** on a scoring date when it has at least **2 completed working sets**.

Rules:

- warmup sets do not count;
- an exercise is identified by its canonical `exercise_id`, not its display label;
- the same canonical exercise can earn exercise-completion XP only once per scoring date;
- at most 6 exercises score per date;
- maximum daily exercise-completion XP = **30**.

This layer rewards meaningful exercise completion without rewarding unlimited exercise padding.

## 3. Exercise progression XP

Progression is self-comparison only. Another user's strength, group size, leaderboard rank, or device never changes a user's progression award.

### Baseline lifecycle

Each measurable canonical exercise is independent.

- no valid prior observation: `UNSEEN`;
- first valid performance establishes the exercise baseline and earns **0 progression XP**;
- later valid comparable performances compare against the **pre-existing personal best**;
- the current workout must never update the benchmark before its own bonus is calculated.

The v0.2 168-hour account lock, two-observation calibration, and 7-day benchmark cooldown are removed in `lifting-v1`.

### Weighted exercises

For `WEIGHT_REPS`, the primary comparison metric is Epley estimated 1RM using an eligible completed working set with 1–12 reps:

`e1RM = weight × (1 + reps / 30)`

Use the best eligible set for that canonical exercise in the session.

Relative improvement tiers:

- <1%: 0 XP
- >=1% and <2.5%: +5 XP
- >=2.5% and <5%: +10 XP
- >=5%: +15 XP

### Bodyweight exercises

For unweighted `BODYWEIGHT_REPS`, compare best completed working-set reps against the prior best:

- no improvement: 0 XP
- +1 rep: +5 XP
- +2 reps: +10 XP
- +3 or more reps: +15 XP

Added-weight and assisted variations must not automatically compare with plain bodyweight performance unless the comparison conditions are explicitly normalized later.

### Progression caps

- maximum progression award for one exercise on one scoring date = 15 XP;
- progression awards from distinct exercises **sum**;
- maximum daily progression XP = **30**.

Raw session volume may be stored and shown analytically, but it does not directly award XP in `lifting-v1`.

## 4. Cardio bonus

Cardio is secondary. Eligible categories are:

- `RUNNING`
- `WALKING_HIKING`
- `CYCLING`
- `SWIMMING`
- `SPORT`
- `CARDIO`
- `HIIT`

Activity-specific minimums still apply:

| Category | Minimum active duration |
|---|---:|
| Running | 15 min |
| Walking/Hiking | 30 min |
| Cycling | 20 min |
| Swimming | 15 min |
| Sport | 20 min |
| Cardio | 20 min |
| HIIT | 12 min |

Once the category minimum is met, duration awards:

- under 30 minutes: +5 XP
- 30 to <45 minutes: +10 XP
- 45+ minutes: +15 XP

Only the **highest cardio bonus of the scoring date** is awarded. Cardio sessions do not stack beyond 15 XP/day.

`MOBILITY` and `OTHER` may be recorded as history but do not earn cardio bonus XP in `lifting-v1`.

## 5. Daily total

The authoritative daily total is:

`lifting workout XP + exercise completion XP + progression XP + cardio bonus XP`

Maximum = **125 XP per scoring date**.

Example:

- qualifying lift: +50
- 5 qualifying exercises: +25
- Bench Press progression: +10
- 20-minute run: +5
- total: **90 XP**

## 6. Weekly lifting target

The existing weekly-target field now means **lifting days per week**.

`weekly lifting consistency = min(qualifying lifting dates / weekly lifting target, 1)`

Rules:

- Monday through Sunday in the user's scoring timezone;
- multiple lifting sessions on one date count as one lifting day;
- cardio-only dates do not count;
- target changes apply at the next week boundary;
- consistency is capped at 100%.

There is **no weekly-improvement XP** in `lifting-v1`.

Instead, consistency can drive a weekly goal streak:

- hit the weekly lifting target -> completed-week streak increments;
- miss the target -> completed-week streak resets.

This avoids incentivizing unnecessary seven-day lifting streaks.

## 7. Scoring date and manual history

Scoring date is the local calendar date at workout start using the recorded timezone-at-start.

Manual/backfilled data rules remain conservative:

- workout history can be stored;
- authoritative scoring must use explicit grace/reconciliation rules when implemented;
- editing or deleting scored workouts/sets must reconcile derived scoring rather than leave orphaned XP or progression state.

## 8. Authoritative persistence

From `lifting-v1` onward:

- `scoring_events` is the new authoritative XP ledger target;
- `exercise_progress_observations` stores exercise-specific scored observations;
- `exercise_progress` stores current exercise personal-best snapshots;
- legacy `xp_events`, `performance_observations`, and `performance_benchmarks` remain only for v0.2 migration compatibility and must not receive new lifting-v1 scoring logic.

The client may read its derived scoring/progression state but may not directly write authoritative scoring or progression tables.

## 9. Fairness / anti-cheese invariants

- one 50-XP lifting-workout award per user/scoring date;
- exercise-completion XP once per canonical exercise/date;
- at least 2 working sets are required for exercise-completion XP;
- at most 6 exercises score completion XP/day;
- warmups never qualify;
- first valid exercise observation is baseline-only;
- progression compares against a pre-existing personal best;
- progression XP is capped at 15/exercise and 30/day;
- cardio uses only the single best daily bonus and is capped at 15/day;
- cardio does not satisfy the weekly lifting target;
- raw weight does not change lifting-workout completion XP;
- raw training volume does not directly award XP;
- another user's ability, group size, leaderboard position, or wearable ownership never changes scoring;
- duplicate/offline/concurrent requests must not manufacture duplicate authoritative events;
- deletion/edit reconciliation is required before scoring persistence is considered complete.

## 10. Badges

Badges remain non-XP initially. They can recognize PRs, weekly goal streaks, milestones, and training behavior without becoming another scoring loophole.

## 11. Phase 19 muscle-volume intelligence — locked `muscle-volume-v1`, non-XP

Phase 19 introduces a separate analytics methodology for estimating muscle-group training volume. **It does not change `lifting-v1` XP, workout qualification, progression XP, or logical completed-set counts.**

The methodology is set-based because sufficiently hard sets are the most practical supported unit for hypertrophy-oriented volume. Raw repetitions and `sets × reps × load` remain useful workload measures, but neither should be converted linearly into hypertrophy credit.

### 11.1 Core calculation

The internal unit is a **set-stimulus equivalent**. The user-facing aggregate is **effective sets** for a muscle group.

`muscle effective sets = set-stimulus equivalents × exercise-to-muscle contribution weight`

Credits are additive within a reporting window. Diminishing returns are interpreted by the benchmark/recommendation layer rather than progressively discounting every later set in the same workout or week.

A logged `WORKING` label alone does **not** guarantee `1.0` set-stimulus equivalent. Phase 19.2 locks a personalized set-quality layer so an obviously submaximal single does not score the same as a demanding multi-repetition set for the same user.

### 11.2 Personal set-quality proxy

Top Set may use previous performance to estimate whether a set was close to the user's **demonstrated exercise capability**, but this is a **baseline-relative performance proxy, not factual RIR**.

For `WEIGHT_REPS`, the preferred personalized baseline is the best valid pre-workout Epley observation for the same canonical exercise from prior completed strength workouts:

`baseline_e1rm = max(weight × (1 + reps / 30))`

Baseline rules:

- use only observations that occurred **before** the workout being scored; future workouts must never reinterpret an earlier set;
- primary baseline window = preceding **180 days**;
- at least **2 prior completed sessions** are required before the baseline is considered established;
- `HIGH` confidence requires at least 3 prior valid sessions with at least one within the preceding 90 days;
- `MEDIUM` confidence requires at least 2 prior valid sessions within 180 days;
- otherwise the set uses a `LOW`/provisional fallback;
- only comparable canonical exercise identity and compatible bodyweight/loading mode may share a baseline.

For a weighted set with 1–30 repetitions, calculate a relative performance index:

`performance_index = current_epley_index / baseline_e1rm`

where `current_epley_index = weight × (1 + reps / 30)`.

The 1–12-repetition range has the strongest compatibility with Top Set's existing E1RM model. Values from 13–30 repetitions may still inform the relative proxy, but confidence is downgraded one level because high-repetition 1RM prediction is less precise.

For plain `BODYWEIGHT_REPS`, use the best pre-workout repetitions from compatible prior completed sessions as the personal capability baseline:

`performance_index = current_reps / recent_best_reps`

Added-weight and assisted modes must not borrow an unweighted bodyweight baseline unless Phase 19.3 explicitly normalizes that exercise/mode.

### 11.3 Set-quality credit

For an established personalized baseline, `muscle-volume-v1` uses deliberately coarse tiers rather than pretending to know exact RIR:

| Baseline-relative performance | Set-stimulus credit |
|---|---:|
| `performance_index >= 0.90` | `1.0` |
| `0.80 <= performance_index < 0.90` | `0.5` |
| `performance_index < 0.80` | `0` |

These thresholds are a **Top Set v1 calibration**, not a claim that research has validated an exact biological conversion from E1RM percentage to hypertrophy. The coarse tiers are intentionally conservative and methodology-versioned.

Additional rules:

- a one-repetition set is capped at `0.5` set-stimulus equivalent in v1, even when it is very heavy;
- an explicitly logged completed `FAILURE` set with at least 2 repetitions receives `1.0` credit because the user supplied stronger effort evidence than the inferred proxy;
- a one-repetition `FAILURE` set remains capped at `0.5`;
- `WARMUP`, incomplete work, and work inside cancelled/non-completed sessions contribute `0`;
- a standard set above 30 repetitions is capped at `0.5` unless it is explicitly logged as `FAILURE`, because the baseline model is not intended to fabricate high-repetition RIR;
- the scoring engine must retain the numeric credit **and** confidence/source metadata so reports can distinguish personalized high-confidence volume from provisional volume.

### 11.4 Provisional fallback for new/sparse-history users

Top Set must still produce useful analytics before a personalized baseline exists.

For `LOW`-confidence/provisional sets:

- completed standard `WORKING`, 2–30 reps: `1.0` provisional credit;
- completed standard `WORKING`, exactly 1 rep: `0.5` provisional credit;
- completed standard `WORKING`, >30 reps: `0.5` provisional credit;
- completed `FAILURE`, 2+ reps: `1.0` provisional credit;
- completed `FAILURE`, 1 rep: `0.5` provisional credit.

Provisional volume may be displayed, but later recommendation logic must not present high-confidence prescriptive conclusions when too much of the reporting window depends on provisional scoring.

### 11.5 Advanced-set scoring

Logical workout structure and muscle-volume scoring remain separate concepts.

**Pyramids**

Each completed Pyramid stage is evaluated through the same set-quality rules above and contributes its own stage credit. Therefore:

`pyramid set-stimulus equivalents = sum(stage_quality_credit)`

A five-stage Pyramid may contribute anywhere from `0` to `5.0` set-stimulus equivalents depending on the actual stage performances. The Pyramid remains one logical `workout_set` for existing Phase 18 history/workflow/XP semantics.

**Drop Sets**

Drop continuations occur under accumulated fatigue, so they must not be compared to a fresh/rested personal baseline as if they were independent ordinary sets.

Score the first Drop stage using the normal set-quality method, then apply conservative continuation credit:

`drop set-stimulus equivalents = first_stage_credit × min(1 + 0.5 × valid_continuations, 2.0)`

A valid continuation must:

- follow the first stage contiguously in segment order;
- have at least 2 repetitions;
- use a lower load than the immediately preceding stage.

Consequences:

- first stage `1.0` + two valid drops -> `2.0` total;
- first stage `0.5` + two valid drops -> `1.0` total;
- first stage `0` -> the Drop chain contributes `0` effective-set credit;
- additional stages beyond the `2.0` multiplier cap still contribute to raw repetitions/tonnage but not additional hypertrophy set credit.

The continuation coefficient and cap are a conservative Top Set calibration. Current Drop Set research supports the method as time-efficient and broadly comparable with traditional training for hypertrophy, but it does not establish a universal one-drop-stage-to-one-rested-set conversion.

**Supersets**

Supersets receive no volume bonus or penalty. The underlying eligible sets are scored normally for their own exercises.

### 11.6 Repetitions, load, tonnage, and effort

- Raw repetitions are not linearly converted into effective sets.
- Tonnage/volume-load (`sets × reps × load`) remains descriptive workload, not the primary hypertrophy score.
- Heavier load does not automatically earn more hypertrophy credit; a hard low-repetition set can score highly while an easy heavy or light set can score partially or zero.
- Top Set does **not** display the baseline-relative proxy as an RIR number.
- If explicit RIR/RPE is added later, a future methodology version may use it as stronger evidence without rewriting frozen historical reports.
- The current proxy should be described to users as something like **set quality** or **relative effort**, never as measured/inferred RIR.

### 11.7 Exercise-to-muscle contribution

For each volume-eligible canonical exercise, Phase 19.3 maps the exercise independently to one or more reportable muscle groups:

- direct/primary contribution: `1.0`;
- meaningful indirect/secondary contribution: `0.5`;
- no meaningful contribution: absent mapping / `0`.

Multiple muscles may legitimately receive direct `1.0` credit when the movement meaningfully trains more than one target muscle. Contribution weights are per-muscle exposure; they do **not** need to sum to `1.0` across the exercise.

Example: if a Bench Press Drop Set earns `2.0` set-stimulus equivalents, a mapping of Chest `1.0`, Triceps `0.5`, and Shoulders `0.5` produces Chest `2.0`, Triceps `1.0`, and Shoulders `1.0` effective sets.

The contribution model is independent from `exercise_catalog.primary_muscle_group`, which remains a picker/browsing taxonomy.

### 11.8 Exercise eligibility

- `WEIGHT_REPS` and plain `BODYWEIGHT_REPS` resistance exercises are eligible once their Phase 19.3 contribution mapping is approved.
- `DURATION` and `OTHER` exercises are excluded by default and require explicit Phase 19.3 inclusion with a justified scoring rule.
- Assisted/added-weight bodyweight modes require explicit compatibility rules rather than silently borrowing plain-bodyweight baselines.
- No exercise becomes volume-eligible merely because it exists in the catalogue.

#### Phase 19.3 reviewed matrix

The reviewed `muscle-volume-v1` exercise decision set lives at `supabase/release/phase19-3-exercise-muscle-matrix.json`. It remains the source input for Phase 19.4 persistence and, after the Phase 19.3A refresh, covers all **464 active canonical exercises** in the reviewed catalogue snapshot.

- After Phase 19.3A, **326 exercises are volume-eligible** and **138 are explicitly excluded/deferred**.
- Eligible `WEIGHT_REPS` rows use the personalized weighted set-quality path; eligible plain `BODYWEIGHT_REPS` rows use the compatible repetition-baseline path.
- `DURATION` and `OTHER` are excluded in v1 because Top Set does not yet have a methodology-compatible set-stimulus conversion for time, distance, assistance, bands, carries, or other nonstandard resistance inputs.
- `FULL_BODY` movements are excluded in v1. Olympic/power, ballistic, strongman, and mixed whole-body patterns must not be passed through the ordinary Epley-derived hypertrophy set-quality model merely because some are stored as `WEIGHT_REPS`.
- Hip-adduction exercises are excluded until a reportable adductor group exists; tibialis raises are excluded because anterior-tibialis work must not be credited to the CALVES benchmark.
- Rotator-cuff/scapular-control and mobility-dominant drills are not treated as ordinary deltoid/back hypertrophy sets in v1.
- Push-press variations using intentional leg drive are excluded from the v1 shoulder hypertrophy matrix rather than scored with a strict-press baseline.
- Common presses map direct chest or shoulders plus meaningful `0.5` synergist credit; rows/pulls map direct back plus `0.5` biceps; direct arm/isolation work maps `1.0` to its target; squat/lunge/hinge families use reviewed quad/glute/hamstring/back combinations instead of a primary-muscle fallback.
- Technique-sensitive compounds carry `MEDIUM`/`LOW` mapping confidence and `review_flag = true` where execution can materially alter the contribution split.

The matrix is deliberately explicit. Runtime code and Phase 19.4 migrations must not synthesize missing mappings with string matching, `primary_muscle_group`, or generic equipment rules. An exercise absent from an active versioned mapping is **not volume-eligible by implication**.

- Phase 19.3A adds 58 dumbbell exercises without new picker categories. Fifty are explicitly mapped as eligible WEIGHT_REPS movements; eight FULL_BODY dumbbell ballistic/whole-body movements are catalogue-valid but remain excluded from v1 effective-volume calculations.

### 11.9 Weekly and 28-day benchmark bands

Benchmarks describe general hypertrophy-oriented training-volume ranges, not medical limits or guarantees of optimal growth. They are applied to **combined direct + fractional indirect effective sets** and carry confidence labels because muscle-specific evidence is uneven.

| Muscle group | 7-day target | Midpoint | High-review above | Evidence confidence |
|---|---:|---:|---:|---|
| CHEST | 10–18 | 14 | 20 | Moderate |
| BACK | 12–20 | 16 | 22 | Moderate |
| SHOULDERS | 10–16 | 12 | 18 | Moderate |
| BICEPS | 10–16 | 12 | 18 | High |
| TRICEPS | 12–20 | 16 | 22 | High |
| QUADS | 12–18 | 14 | 20 | High |
| HAMSTRINGS | 10–16 | 12 | 18 | Moderate-low |
| GLUTES | 10–16 | 12 | 18 | Moderate |
| CALVES | 10–16 | 12 | 18 | Moderate-high |
| FOREARMS_GRIP | 6–12 | 8 | 14 | Low |
| CORE | 6–12 | 8 | 14 | Low |
| OBLIQUES | 4–10 | 6 | 12 | Low |
| NECK | 6–9 | 7 | 10 | Low-moderate |

`FULL_BODY` and `OTHER` do not receive benchmark bands.

The 28-day benchmark is exactly `4 ×` the corresponding 7-day values in v1.

Volume status:

- `NO_DATA`: no eligible mapped training evidence exists for the requested window;
- `LOW`: effective volume is below 50% of the target lower bound;
- `BELOW_TARGET`: at least 50% of the lower bound but still below target;
- `ON_TARGET`: within the target band;
- `ABOVE_TARGET`: above the target band but not beyond high-review threshold;
- `HIGH_REVIEW`: above the high-review threshold.

`HIGH_REVIEW` means **review in context**, not automatically "too much." Phase 19.8 may distinguish high-but-productive training from high volume accompanied by stagnation/decline.

If training history exists but effective volume for a muscle is zero, report `LOW` rather than `NO_DATA`.

### 11.10 Reporting windows and confidence

Rolling analytics:

- 7-day window = anchor local date and previous 6 local dates;
- 28-day window = anchor local date and previous 27 local dates;
- default anchor = the user's current local date derived from the profile timezone;
- rolling views use the active methodology version.

Completed-period reports:

- weekly report = completed Monday–Sunday local calendar week;
- monthly report = completed local calendar month;
- frozen monthly snapshots store the methodology version and the already-calculated aggregate so future methodology changes do not rewrite the historical report.

Report payloads should expose, at minimum:

- total effective sets per muscle;
- direct and indirect effective-set components;
- raw eligible logical-set/stage counts as descriptive context;
- target/status for 7- or 28-day scope;
- methodology version;
- proportion of volume derived from `HIGH`, `MEDIUM`, and `LOW`/provisional set-quality evidence.

Recommendations in Phase 19.8 must return `INSUFFICIENT_DATA` when baseline/contribution coverage is too weak for a confident prescriptive conclusion.

### 11.11 Versioning

The first implementation version is:

`muscle-volume-v1`

The methodology version owns, as one coherent contract:

- personalized set-quality thresholds and fallback rules;
- baseline window/confidence rules;
- advanced-set formulas;
- exercise-to-muscle contribution mappings;
- muscle benchmark bands and status thresholds.

A later methodology revision creates a new version. It must not silently reinterpret frozen monthly reports.

### 11.12 Evidence basis for `muscle-volume-v1`

The methodology is anchored to the following evidence while keeping product-specific coefficients explicit:

- Pelland et al., *Sports Medicine* (2026), PMID `41343037`, DOI `10.1007/s40279-025-02344-w`: weekly fractional set volume showed a positive hypertrophy dose-response with diminishing returns; counting meaningful indirect work as `0.5` had the strongest relative model evidence.
- Currier et al., ACSM Position Stand, *Medicine & Science in Sports & Exercise* (2026), PMID `41843416`, DOI `10.1249/MSS.0000000000003897`: hypertrophy is enhanced by higher weekly set volume; load, momentary failure, and set structure do not justify simple linear multipliers.
- Baz-Valle et al., *Journal of Strength and Conditioning Research* (2021), PMID `30063555`, DOI `10.1519/JSC.0000000000002776`: sufficiently hard sets are a practical hypertrophy-volume unit under common resistance-training conditions.
- Baz-Valle et al. (2022), PMID `35291645`: 12–20 weekly sets per muscle was a reasonable standard recommendation in young trained men, with muscle-specific uncertainty.
- Robinson et al., *Sports Medicine* (2024), PMID `38970765`, DOI `10.1007/s40279-024-02069-2`: hypertrophy tended to increase as sets terminated closer to failure, but the exact continuous RIR relationship remains uncertain.
- Refalo et al. (2023), PMID `36334240`, and Currier et al. (2026): failure itself does not warrant an automatic hypertrophy bonus above sufficiently hard non-failure work.
- Hughes et al. (2020), PMID `33337690`, Mansfield et al. (2020), PMID `32881842`, and Halperin/related RIR-prediction literature: RIR estimation accuracy varies with load and proximity to failure, supporting Top Set's decision not to label a history-derived proxy as factual RIR.
- Individualized RIR/velocity research (e.g. PMID `38418370`, `40125884`) generally performs better than generalized relationships when objective velocity data are available, supporting personalization in principle while also underscoring that Top Set should remain conservative without velocity sensors.
- Schoenfeld et al. (2017), PMID `28834797`, Lopez et al. (2021), PMID `33433148`, and Carvalho et al. (2022), PMID `35015560`: hypertrophy can occur across a broad loading range when effort is sufficient; therefore load or raw rep count should not be converted linearly into growth credit.
- Schoenfeld et al. (2017), PMID `27928218`, and Mangine/related low-rep work support meaningful hypertrophy from hard 2–4-repetition training, while the evidence base for isolated singles as an equal per-set hypertrophy dose is much thinner; the v1 single-rep `0.5` cap is therefore an explicit conservative product calibration.
- Havers et al., *Sports Medicine - Open* (2026), PMID `41920484`, DOI `10.1186/s40798-026-01012-1`, together with Sødal et al. (2023), PMID `37523092`: Drop Sets and traditional training show broadly comparable chronic hypertrophy outcomes and strong time efficiency, but no universal per-drop-stage conversion is established.
- Cardozo & Destro (2023), PMID `37330772`, DOI `10.1016/j.jbmt.2023.04.070`: pyramid systems are not superior to volume-matched traditional training; their stages should be evaluated as work bouts rather than receive a technique bonus.
- Kassiano et al. (2024), PMID `38684187`, and Krause Neto et al. (2025), PMID `40276368`, help inform calf/glute evidence confidence but do not justify pretending all muscle-specific benchmark ranges are equally certain.

The `0.90` / `0.80` performance-index tiers, 180-day baseline window, single-rep cap, Drop Set continuation coefficient/cap, and muscle-specific high-review cutoffs are **methodology-versioned Top Set decisions** informed by the evidence above; they are not presented as universally validated physiological constants.
