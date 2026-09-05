# UI Development Gate

Use this checkpoint for substantial user-facing UI or interaction changes. Small copy/spacing repairs do not need a ceremonial design phase, but any change that materially alters hierarchy, workflow, or responsive behavior should pass this gate.

## 1. Define behavior first

Document the user goal, entry/exit conditions, required data, actions, permissions, loading/empty/error/offline/conflict states, and success condition before styling.

## 2. Establish the mobile-first hierarchy

Decide what must remain visible and actionable on a phone before adding desktop composition. Use real product data/actions rather than invented placeholder metrics.

For a material visual redesign, create/review a concept before committing the production layout direction.

## 3. Define responsive/interaction ownership

Before coding, decide:

- scroll owner;
- safe-area behavior;
- fixed/sticky elements;
- keyboard-open behavior;
- focus management/restoration;
- 320px containment;
- tablet/desktop adaptation;
- reduced-motion behavior where animation exists.

## 4. Define component boundaries

```text
screen / page
  -> feature sections/components
      -> shared primitives only when genuinely reusable

screen / page
  -> focused hook/controller
      -> feature service/repository
          -> Supabase

pure domain helpers
  -> no React
  -> no Supabase
```

Pages compose. Visual components do not become persistence layers. Services do not make presentational decisions.

## 5. Implement accessibly

Use semantic HTML and accessibility contracts from the start. Hiding an unauthorized action in the UI never replaces server-side authorization.

## 6. Validate before closing

At minimum, for affected surfaces verify:

- 320px-class phone;
- current iPhone/Android-class phone sizes;
- desktop;
- keyboard and focus behavior;
- labels/accessible names;
- loading/error/empty/offline/conflict states that apply;
- no horizontal page overflow;
- relevant Chromium/WebKit tests.

## Current major checkpoints

A deliberate UI review is expected for the remaining Phase 18 surfaces when they materially change presentation:

- 18.6 Superset history grouping;
- 18.7 Superset presets;
- 18.7B tracked-exercise analytics and exercise-picker Recent hierarchy;
- 18.8 complete active-workout polish;
- Phase 19/20 native and live workout surfaces.

See [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md), [`CSS-ARCHITECTURE.md`](CSS-ARCHITECTURE.md), and [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
