# UI Development Gate

This document is a required checkpoint before substantial user-facing UI work.

## Why this exists

The project should not discover its visual architecture while production components are already being written. Each major experience first gets a visual concept, then a component/data plan, then implementation.

This keeps product decisions separate from code structure and prevents a polished mockup from turning into one large, tightly coupled React component.

## Required sequence

### 1. Define behavior before appearance

Write down:

- user goal;
- entry and exit conditions;
- required data;
- user actions;
- loading state;
- empty state;
- validation errors;
- network/server errors;
- success state;
- permission-dependent states.

No visual design is required yet.

### 2. Generate a concept image

Before implementing the substantial screen, generate a phone-first image that explores:

- hierarchy;
- navigation;
- information density;
- typography scale;
- card/list treatment;
- gamification tone;
- primary and secondary actions.

The concept image is a design reference, not a production asset and not a background image to be copied into the app.

### 3. Review before coding

Review the generated concept and explicitly decide what to keep/change. Do not begin production layout implementation until the direction is accepted.

### 4. Define responsive behavior

Document how the approved phone layout changes at larger widths. Watch-sized requirements should be component contracts, not a promise that the web PWA is a native watch app.

### 5. Define component boundaries

Before implementation, map the component tree. Use these boundaries:

```text
screen/page
  -> feature sections
      -> feature components
          -> shared primitives (only when genuinely reused)

screen/page
  -> feature hook/controller
      -> feature service/repository
          -> Supabase

pure validators/domain helpers
  -> no React
  -> no Supabase
```

Rules:

- pages compose; they do not become service layers;
- visual components do not call Supabase directly;
- services do not contain presentational decisions;
- pure business rules remain framework-independent;
- hooks coordinate UI state and async operations;
- reusable primitives should be extracted after a real reuse case exists;
- split components by responsibility rather than arbitrary line count.

### 6. Implement the approved layout

Build the approved concept with semantic HTML and accessibility from the start. The implementation may refine the mockup where real content, interaction, or accessibility requires it.

### 7. Validate before closing the gate

At minimum verify:

- phone viewport;
- desktop viewport;
- smallest supported component/watch contract where relevant;
- keyboard navigation;
- focus visibility;
- labels and accessible names;
- reduced-motion behavior for nonessential animation;
- loading/error/empty/success states;
- no horizontal overflow;
- browser tests for the critical flow.

## Major checkpoints currently expected

A new concept/review gate is required before:

1. authentication/onboarding/group setup UI;
2. authenticated dashboard;
3. workout capture/exercise search UI;
4. leaderboard/social UI;
5. analytics/history UI;
6. native/watch companion UI if that phase is reached.
