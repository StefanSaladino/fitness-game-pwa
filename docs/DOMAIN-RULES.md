# Domain Rules — Source of Truth

This document defines the locked **v0.3 / `lifting-v1`** scoring model. Tests and persistence code may be more detailed, but they must not contradict these rules.

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
