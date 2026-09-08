# Phase 18 — Live Lifting Workflow Roadmap

Status: **IN PROGRESS**

Phase 18 builds a denser, more deliberate live-workout experience on top of Top Set's existing durable workout, scoring, recovery, analytics, and PWA foundations.

Superset structure does not create bonus XP, alternate scoring rules, or a second set model. Existing exercises and sets remain authoritative.

## Current phase status

- **18.0 Compact sticky workout timer — DONE**
- **18.1 Collapsible completed sets — DONE**
- **18.2 Superset data model/foundation — DONE**
- **18.3 Superset builder — DONE**
- **18.4 Active Superset flow — DONE** — full validation gate passed.
- **18.5 Superset recovery & reliability — DONE**
- **18.6 Supersets in history — DONE**
- **18.7 Supersets in preset workouts — IN VALIDATION**
- **18.7A Drop Sets + Pyramid workflows — PLANNED**
- **18.7B Selective E1RM/deep analytics tracking + exercise-picker refinement — PLANNED**
- **18.8 Active workout polish pass — PLANNED**
- **18.9 Regression & production release — PLANNED**

Drop Sets and Pyramid workflows are now explicitly scheduled for Phase 18.7A. Drop Sets use the existing DROP set classification. Full Pyramid and Ascending Pyramid are set-sequence workflows built on ordinary independent weight/rep sets rather than alternate scoring entities. All of them continue to contribute to normal lifting volume and do not receive bonus XP.

---

# Phase 18.4 — Active Superset Flow — DONE

Make linked exercises behave naturally during the workout.

For:

```text
A1 Bench Press
A2 Cable Fly
A3 Push-up
```

the logical sequence becomes:

```text
Bench Press — Set 1
        ↓
Cable Fly — Set 1
        ↓
Push-up — Set 1
        ↓
Bench Press — Set 2
        ↓
Cable Fly — Set 2
        ↓
Push-up — Set 2
```

Top Set makes the expected next movement obvious without forcing the user into it.

## Sequence contract

Superset members remain ordinary workout exercises with ordinary sets. Active guidance is derived in round-robin order by set number:

```text
A1 Set 1 → A2 Set 1 → A3 Set 1 → A1 Set 2 → ...
```

Only sets that actually exist participate. The flow never invents or automatically adds a missing set.

The active sequence is guidance, not a lock. Users may open, edit, or complete another Superset member at any time.

## UI behavior

- the shared Superset card remains the grouping boundary;
- show completed/total Superset set progress;
- present the first incomplete round-robin step as `Next`;
- visually highlight the corresponding nested exercise and expose `aria-current="step"`;
- provide a one-tap `Go to A#` action that expands and scrolls to that member only when requested;
- completing or editing a set recalculates the next target from current state;
- do not auto-scroll, auto-expand, or block manual access to another Superset member;
- once every existing Superset set is complete, report `Superset complete`.

## Rest behavior

Do **not** hard-code bodybuilding rules.

Users may:

- rest between exercises;
- rest only after the whole round;
- skip rest entirely;
- manually change timers.

Top Set should facilitate the Superset rather than police it.

Superset sequencing remains independent from rest-timer policy. No Superset-specific automatic rest rule is introduced here.

## Collapsible sets become particularly useful here

A three-exercise Superset could otherwise become enormous on a phone.

Instead:

```text
SUPERSET A

Bench Press
Set 1: 8 reps • 225 lb
▼ Set 2

Cable Fly
Set 1: 12 reps • 35 lb
▼ Set 2

Push-up
Set 1: 15 reps • BW
▼ Set 2
```

Completed sets stay dense and reopenable while the current work remains easy to find.

## Validation

**Full Phase 18.4 validation passed.**

No Phase 18.4-specific database migration is required. No XP, PR, scoring, set-persistence, Superset-membership, workout-recovery, or rest-timer contract changes are introduced by the active-flow layer.

---

# Phase 18.5 — Superset Recovery & Reliability — DONE

Before expanding Supersets elsewhere, make sure they survive everything Top Set already handles.

Verify:

- refresh during an active Superset;
- app killed/reopened;
- temporary connection loss;
- offline operation;
- recovered unfinished workout;
- duplicate-action protection;
- editing an earlier Superset set;
- reordering exercises;
- deleting an exercise;
- cancelling a workout;
- completing a workout.

Recovery must restore:

```text
Superset grouping
Exercise order
Round position
Completed sets
Current active set
Timer state
```

No half-reconstructed Supersets.

## Recovery principles

- derive active Superset position from authoritative exercise membership/order plus completed-set state wherever possible;
- do not create a second independent Superset progress store that can drift from workout data;
- queued `SET_SUPERSET` / `CLEAR_SUPERSET` mutations remain idempotent and conflict-safe;
- reconnect/replay must not duplicate membership changes or completed sets;
- editing an earlier completed set must immediately produce a coherent next-step calculation;
- deleting or reordering exercises must either produce a valid Superset structure or deliberately dissolve/rebuild the affected grouping through guarded mutations;
- cancel/finish paths must leave no recoverable ghost Superset state.

Exit criterion: an interrupted Superset workout recovers as coherently as an ordinary Top Set workout.

---

# Phase 18.6 — Supersets in History — DONE

Completed workouts should preserve the way the workout was actually performed.

Do not flatten:

```text
Bench Press
Cable Fly
Push-up
```

into three unrelated exercises if they were linked.

History should show:

**Superset**

- Bench Press
- Cable Fly
- Push-up

Each exercise still gets its normal sets and performance information.

Exercise-level history and progress remain independent.

## History principles

- preserve completed Superset grouping and member order with the completed workout;
- render Supersets as a visual grouping, not as a separate scoring entity;
- exercise PRs, analytics, progression, volume, and history remain attributed to each exercise normally;
- removing or changing a later preset/Superset definition must never rewrite completed workout history;
- old non-Superset workouts continue to render unchanged.

---

# Phase 18.7 — Supersets in Preset Workouts — IN VALIDATION

Allow preset workouts to contain Supersets.

Example:

**Push preset**

```text
Bench Press

Superset
A1 Incline Dumbbell Press
A2 Cable Fly

Superset
B1 Lateral Raise
B2 Triceps Extension
```

Starting the preset should atomically reproduce the grouping and ordering.

Existing non-Superset presets continue to work unchanged.

Implementation note: Phase 18.7 uses an overloaded Superset-aware preset-start RPC that delegates to the existing guarded preset-start function in the same transaction. Full Body Strength and Lower Strength remain ordinary presets; Upper Strength, Push, and Pull declare an initial accessory Superset.

## Preset principles

- preset definitions may intentionally declare Superset groups and member order;
- starting a preset creates exercises and Superset structure atomically through the existing guarded workout-start boundary;
- partial preset creation is unacceptable;
- ordinary non-Superset preset behavior is unchanged;
- preset Superset definitions do not create special scoring or progress attribution.

---

# Phase 18.7A — Drop Sets + Pyramid Workflows

Extend live set construction without creating alternate scoring systems.

## Drop Sets

Drop Sets use the existing `DROP` set classification and remain ordinary completed sets.

Requirements:

- users can add/mark Drop Sets clearly during an active workout;
- Drop Sets remain attached to their normal exercise;
- every completed Drop Set contributes to normal exercise/session/weekly/monthly volume;
- Drop Sets do not create bonus XP, special PR math, or a separate progression model;
- recovery/offline replay must preserve Drop Set classification exactly like other set mutations.

## Full Pyramid

A full Pyramid is a sequence pattern rather than a separate scoring entity.

Conceptually:

```text
lighter / more reps
        ↓
heavier / fewer reps
        ↓
peak set
        ↓
lighter / more reps
```

Top Set may provide a quick-build/prefill helper, but every set remains independently editable and authoritative.

## Ascending Pyramid

An Ascending Pyramid generally increases load across successive sets while reps may decrease:

```text
Set 1: lighter
Set 2: heavier
Set 3: heavier
Set 4: heaviest
```

Again, this is a workflow/pattern layered over ordinary sets. It does not require a new scoring entity.

## Advanced-set invariants

- all completed sets count toward total lifting volume;
- normal exercise PR/evidence rules remain authoritative;
- no pattern receives bonus XP;
- no automatic weight/repetition rule is enforced;
- users may edit the generated/prefilled values freely;
- ordinary sets continue working unchanged.

---

# Phase 18.7B — Selective Exercise Analytics Tracking + Picker Refinement

Give users explicit control over which exercises appear in their long-term lifting analytics, and clean up exercise-picker hierarchy before the final workout polish pass.

## User-selected tracked exercises

Users should not be forced to treat every exercise they have ever logged as a permanent E1RM/deep-analytics lift. Tracking is selective for per-exercise analytics only; it is not a filter on global training volume.

During an active workout, each exercise should expose a clear **Track in analytics** checkbox before that exercise is completed.

When selected:

- the exercise is added to the user's tracked-exercise analytics list;
- its normal completed workout/set data remains the source of analytics;
- selecting the checkbox does not alter XP, scoring, PR rules, or workout completion;
- duplicate tracking entries are impossible;
- the preference persists across sessions/devices for the authenticated user.

When not selected:

- the exercise is still logged normally in workout history;
- every completed set still contributes to session volume and weekly/monthly total lifting volume;
- scoring/XP and retained PR evidence continue to use the normal completed-workout data;
- it simply does not become one of the user's chosen E1RM/in-depth analytics exercises.

## Removing tracked exercises

Users must be able to remove an exercise from their tracked analytics list later if they no longer care about it.

Removing tracking should:

- remove the exercise from tracked-lift analytics/navigation surfaces;
- stop treating it as a selected analytics exercise going forward;
- **not delete workout history, sets, PR evidence, or underlying completed-workout data**;
- allow the same exercise to be tracked again later without data corruption.

Tracking is a user preference/view-selection layer for E1RM and in-depth per-exercise statistics. It is not destructive workout-data retention and it never removes an exercise from aggregate volume totals.

## Exercise-picker recent section

The exercise picker hierarchy should be:

```text
Search / exercise controls
Body-part selector
Recent exercises
Exercise results/library
```

Requirements:

- **Recent exercises must appear underneath the body-part selector**;
- Recent exercises must be **collapsible**;
- Recent exercises must be **collapsed by default** whenever the picker opens;
- expanding Recent must not change the selected body-part filter;
- recent items still use the canonical exercise identity and normal add-exercise flow;
- long recent lists must not dominate the picker or push the body-part selector out of the first useful viewport;
- narrow-phone and keyboard-open behavior must remain contained.

## Validation

Add focused tests for:

- tracking an exercise from the live workout;
- idempotent repeated tracking;
- removing a tracked exercise without deleting historical workout data;
- re-tracking a previously removed exercise;
- tracked preference persistence;
- Recent exercises rendering below the body-part selector;
- Recent collapsed by default;
- expanding/collapsing Recent without disturbing filters or search state.

---

# Phase 18.8 — Active Workout Polish Pass

Once the timer, collapsible sets, Supersets, tracked-exercise control, and picker hierarchy coexist, stop adding features temporarily and perform a full UX pass.

This phase is important.

## Evaluate real usable viewport

Measure what remains after:

- iPhone safe area;
- Top Set app header;
- compact active-workout bar;
- exercise heading;
- bottom navigation.

The goal is not just to pass overflow tests.

The goal is:

> **How much useful workout information can someone actually see while standing in a gym holding their phone?**

## Test specifically

- 320px width;
- regular iPhones;
- large iPhones;
- Android phones;
- landscape;
- keyboard open;
- long exercise names;
- 10+ exercise workouts;
- large Supersets;
- mixed collapsed/expanded sets;
- active rest timer;
- paused workout;
- scrolling quickly;
- returning to top/full timer banner;
- tracked-analytics checkbox placement and tap target;
- expanded and collapsed Recent-exercise picker states.

## Expected result

By the end of Phase 18, the PWA should feel substantially denser and more deliberate during a workout.

---

# Phase 18.9 — Regression & Production Release

Before native work begins, run the complete web/PWA release gate:

- TypeScript;
- full unit suite;
- integration tests;
- database contract;
- production build;
- bundle budget;
- structure validators;
- Chromium desktop;
- Android Chromium;
- iPhone-class WebKit;
- offline/recovery tests;
- workout lifecycle tests;
- 320px composition;
- Superset-specific tests;
- tracked-exercise analytics tests;
- exercise-picker Recent-section tests.

Then production deploy.

At this checkpoint:

> **Top Set's web/PWA workout experience becomes the stable baseline for native development.**

---

# Phase 19.0 — Native Architecture Investigation

Only after the stable PWA checkpoint do we begin the larger platform change.

The goal is **not to rewrite Top Set in Swift/Kotlin**.

Preferred direction:

```text
                 Top Set
             React + Supabase
                    │
       ┌────────────┼────────────┐
       │            │            │
      PWA       iOS shell    Android shell
                    │            │
                native APIs   native APIs
```

Most likely use **Capacitor** unless the proof-of-concept exposes a reason not to.

## Proof-of-concept requirements

Confirm:

- existing React build runs correctly;
- Supabase Auth works;
- refresh/session restoration works;
- secure storage requirements are understood;
- deep links work;
- confirmation/reset links work;
- PWA continues existing independently;
- native app lifecycle does not corrupt workouts;
- Web Push/native push strategy is understood;
- deployment pipelines remain clearly separated.

No Live Activity yet.

---

# Phase 19.1 — Native App Shell

Turn the proof into an actual supported Top Set native build.

Initially, it should behave almost exactly like the PWA.

Do **not** redesign everything merely because it is in an App Store container.

The purpose is capability, not duplication.

---

# Phase 19.2 — Native Workout State Bridge

This is the most important architectural preparation for Live Activities.

The native side should **not** reach randomly into React state.

Create a small explicit bridge, conceptually:

```text
{
  workoutId,
  workoutName,
  status,
  startedAt,
  pausedAt,
  elapsedSeconds,

  currentExercise: {
    id,
    name,
  },

  currentSet: {
    number,
    totalSets,
    reps,
    weight,
    unit,
  },

  completedExercises,
  totalExercises
}
```

React/Supabase remains authoritative.

Native integrations receive only the narrow state they actually need.

This bridge should understand Supersets from day one so the contract does not need to be redesigned later.

Example:

```text
Bench Press
Set 2 of 4

Next:
Cable Fly
Superset A
```

---

# Phase 19.3 — Native Lifecycle Hardening

Before touching Dynamic Island, prove that a native Top Set workout survives:

- locking the phone;
- backgrounding;
- reopening;
- force closing;
- switching networks;
- losing network connectivity;
- Supabase reconnect;
- app update;
- paused workout;
- long-running workout.

Do not place a shiny Live Activity on top of an unreliable lifecycle.

---

# Phase 20 — Live Workout Surfaces

**This remains the final step.**

Nothing in the earlier phases should depend on having this.

## Phase 20.1 — iPhone Live Activity v1

Use ActivityKit.

Start conservatively with a **display-focused Live Activity**.

### Lock Screen

Example:

```text
TOP SET

Push Day                         34:12

Bench Press
Set 3 of 4
225 lb × 8

4 / 7 exercises
```

If in a Superset:

```text
SUPERSET A

Bench Press
Set 2 of 3

Next: Cable Fly
```

### Dynamic Island

Compact form:

```text
🏋️ 34:12
```

Expanded form can show:

- current exercise;
- set number;
- weight/reps;
- progress.

### Interaction in v1

Tap → **deep-link directly into the active workout**.

Do not initially allow:

- Complete Set;
- Change Weight;
- Skip Exercise.

Those actions create much harder synchronization requirements.

---

## Phase 20.2 — Android Live Workout Surface

Use Android's native ongoing/Live Update capability.

It should consume the **same native workout bridge**, not become a separate product implementation.

Conceptually:

```text
                  Active workout
                        │
               Native state bridge
                    ┌───┴───┐
                    │       │
                  iOS     Android
               ActivityKit Live Update
```

---

## Phase 20.3 — Interactive Lock-Screen Controls

Only once both passive experiences are stable.

Potential controls:

- ⏸ Pause workout;
- ▶ Resume;
- ✓ Complete set;
- Skip rest;
- Next exercise.

Every action must use an idempotent command model so double taps or delayed native events cannot duplicate workout mutations.

This phase is optional.

A high-quality passive Live Activity may already provide most of the value.

---

# Final execution order

**Compact sticky workout timer → pause/resume icon → collapsible completed sets → Superset data model → Superset builder → active Superset flow → Superset recovery → Superset history → Superset presets → Drop Sets + full/ascending Pyramid workflows → selective E1RM/deep exercise analytics + exercise-picker Recent refinement → complete mobile workout polish → full PWA regression/release → Capacitor proof → native shell → native workout bridge → native lifecycle hardening → iPhone Live Activity → Android live surface → optional interactive native controls.**

The first chunk is intentionally strong because the **compact timer + collapsible sets** solve an immediate usability problem, while **Supersets** take advantage of that denser UI instead of worsening vertical-space pressure.

Phase 20 stays deliberately isolated at the end so native live surfaces do not destabilize the production PWA or complicate Phase 18 prematurely.
