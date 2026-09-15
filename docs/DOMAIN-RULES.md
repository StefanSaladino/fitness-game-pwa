# Domain Rules — Source of Truth

This document defines the locked **v0.3 / `lifting-v1`** scoring model and the planned Phase 19 muscle-volume analytics contract. Tests and persistence code may be more detailed, but they must not contradict these rules.

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

## 11. Phase 19 muscle-volume intelligence — planned, non-XP

Phase 19 introduces a separate analytics methodology for estimating muscle-group training volume. **It does not change `lifting-v1` XP, workout qualification, progression XP, or completed-set counts.**

The v1 methodology is intentionally set-based. The evidence base supports weekly set volume as the most practical hypertrophy-oriented dose measure, while raw repetitions and `sets × reps × load` describe external work but do not map cleanly or linearly to muscle growth.

### Core calculation

The internal unit is a **set-stimulus equivalent**. The user-facing aggregate is **effective sets** for a muscle group.

`muscle effective sets = set-stimulus equivalents × exercise-to-muscle contribution weight`

Credits are additive across eligible work in the reporting window. Diminishing returns are interpreted by the benchmark/recommendation layer; individual sets are not progressively discounted merely because they occurred later in a workout or week.

### Set-stimulus equivalents

| Work structure | Phase 19 v1 credit |
|---|---:|
| Completed standard `WORKING` set | `1.0` |
| Completed standard `FAILURE` set | `1.0` |
| `WARMUP` | `0` |
| Incomplete set/stage | `0` |
| Work in a cancelled/non-completed session | `0` |
| Ascending/Full Pyramid | `1.0` per completed stage |
| Drop Set | `1.0` first eligible stage + `0.5` per eligible continuation stage, capped at `2.0` for the logical Drop Set |

A `FAILURE` set receives no bonus above a normal working set. Current evidence does not support treating failure as automatically more hypertrophic than sufficiently hard non-failure work.

Pyramid stages are interpreted as **set-like work bouts grouped into one logical Top Set parent for workflow/history compatibility**. A five-stage Pyramid can therefore contribute five set-stimulus equivalents to Phase 19 analytics even though it remains one logical parent set for existing completed-set/XP semantics.

A Drop Set is different: continuation stages are performed after a load reduction with minimal recovery and are not treated as fully recovered independent sets. The first eligible stage contributes `1.0`; each additional eligible load-reduction stage contributes `0.5`; total credit is capped at `2.0`. For v1, a continuation stage earns credit only when it has positive repetitions and a lower load than the immediately preceding stage. Extra logged Drop stages may still contribute to ordinary reps/tonnage analytics after the effective-set cap is reached.

The Drop Set conversion is a **conservative Top Set v1 calibration, not an experimentally proven universal equivalence**. Current trials/meta-analyses support Drop Sets as a time-efficient hypertrophy method and show broadly comparable long-term outcomes to traditional training, but they do not establish a precise conversion from each no-rest drop stage to a conventional rested set. The rule therefore must remain methodology-versioned and revisable.

Supersets do not receive a volume bonus or penalty. Each underlying exercise's eligible sets are evaluated using the same rules above.

### Repetitions, load, and effort

- Raw repetitions are **not** linearly converted into effective sets. Twenty repetitions are not automatically twice the hypertrophy dose of ten repetitions.
- Tonnage/volume-load (`sets × reps × load`) remains useful descriptive workload data but is **not** the primary muscle-volume score.
- Load does not linearly scale hypertrophy credit; research shows hypertrophy can be achieved across a broad loading range when effort is sufficient.
- Reps and load remain inputs for data validity, advanced-set structure, progression analytics, and descriptive report breakdowns.
- Phase 19 v1 must not infer RIR/RPE from reps and load. Top Set does not currently capture reliable set-level proximity-to-failure data, and the exact continuous relationship remains uncertain.
- A later methodology version may incorporate optional RIR/RPE or other validated effort data without rewriting historical reports.

### Exercise-to-muscle contribution

For each volume-eligible canonical exercise, Phase 19 maps the exercise independently to one or more reportable muscle groups:

- direct/primary contribution: `1.0`;
- meaningful indirect/secondary contribution: `0.5`;
- no meaningful contribution: `0`.

Example: if a three-stage Bench Press Drop Set earns the v1 maximum `2.0` set-stimulus equivalents, a mapping of Chest `1.0`, Triceps `0.5`, and Shoulders `0.5` produces Chest `2.0`, Triceps `1.0`, and Shoulders `1.0` effective sets.

The direct/indirect fractional model is distinct from `exercise_catalog.primary_muscle_group`; primary muscle remains the picker/browsing taxonomy, while contribution mappings drive muscle-volume analytics.

### Eligibility and versioning

- `WEIGHT_REPS` and `BODYWEIGHT_REPS` resistance work can be volume-eligible by default once its contribution mapping is approved.
- `DURATION` and `OTHER` exercises require explicit inclusion/exclusion rather than automatic set-equivalent scoring.
- Every report must identify the methodology version used for set credit, exercise-muscle mappings, and benchmarks.
- Frozen monthly snapshots preserve the methodology version so later scientific/product revisions do not silently reinterpret an old report.

### Evidence basis for the v1 method

The Phase 19 methodology is anchored to the following evidence rather than raw-tonnage heuristics:

- Pelland et al., *Sports Medicine* (2026), PMID `41343037`, DOI `10.1007/s40279-025-02344-w`: weekly set volume showed a positive dose-response with diminishing returns, and fractional counting of indirect work (`0.5`) had the strongest relative model evidence.
- Currier et al., ACSM Position Stand, *Medicine & Science in Sports & Exercise* (2026), DOI `10.1249/MSS.0000000000003897`: higher weekly set volume improves hypertrophy; load, failure, and set structure do not consistently justify simple proportional hypertrophy multipliers.
- Baz-Valle et al., *Journal of Strength and Conditioning Research* (2021), PMID `30063555`, DOI `10.1519/JSC.0000000000002776`: number of sufficiently hard sets is an adequate practical hypertrophy-volume measure under common resistance-training conditions.
- Nunes et al., *Sports Medicine* (2021), PMID `33826122`, DOI `10.1007/s40279-021-01449-2`, and Hammert et al., *Physiological Measurement* (2024), PMID `39178897`: reps and volume-load quantify external work but have important limitations as direct proxies for hypertrophic stimulus.
- Havers et al., *Sports Medicine - Open* (2026), PMID `41920484`, DOI `10.1186/s40798-026-01012-1`, together with Sødal et al. (2023), PMID `37523092`: Drop Sets and traditional training produce broadly comparable chronic hypertrophy outcomes, but the literature does not establish one universal per-drop-stage set conversion.
- Cardozo & Destro (2023), PMID `37330772`, DOI `10.1016/j.jbmt.2023.04.070`, and Angleri et al. (2017), PMID `28130627`: pyramid systems are not superior to volume-matched traditional training; their stages are set-like bouts with changing load/repetition targets rather than a reason to award an extra technique bonus.
- Robinson et al., *Sports Medicine* (2024), PMID `38970765`, DOI `10.1007/s40279-024-02069-2`: proximity to failure appears relevant to hypertrophy, but the exact continuous relationship remains uncertain, supporting a future optional effort-aware revision rather than fabricated RIR inference in v1.
