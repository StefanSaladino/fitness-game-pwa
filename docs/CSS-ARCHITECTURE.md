# CSS Architecture — Source of Truth

From v0.3 forward, CSS follows the same separation-of-concerns rules as TypeScript.

## Shared/global layer

`src/styles/` is reserved for application-wide concerns only:

```text
src/styles/
  tokens.css       design tokens / CSS custom properties
  reset.css        element normalization
  base.css         document typography/background/default focus behavior
  global.css       temporary compatibility entrypoint + truly global utilities only
```

Feature-specific or component-specific selectors must not be added to `global.css` going forward.

## Component layer

Reusable UI/layout components should own their styles beside the component:

```text
Button.tsx
Button.module.css

AppShell.tsx
AppShell.module.css
```

A shared component stylesheet must not target feature internals.

## Feature layer

Feature-specific layout and presentation lives with the feature:

```text
features/workouts/
  components/
    WorkoutScreen.tsx
    WorkoutScreen.module.css
```

Feature CSS must not reach into another feature through implementation-specific selectors.

## Composition rules

- global CSS: tokens, reset, typography, truly shared utilities;
- component CSS: that component's presentation contract;
- feature CSS: feature-specific presentation/layout;
- page/screen CSS: composition only;
- no SQL, scoring, or runtime business decisions expressed through CSS classes;
- avoid selectors that depend on distant DOM ancestry;
- prefer explicit component variants/data attributes over cross-feature selector coupling;
- responsive rules stay with the component/feature they affect unless they define a truly global viewport contract.

## Migration policy

Phase 5 introduced a large `global.css`. It remains operational to avoid a risky unrelated visual rewrite during the lifting-domain refactor. New UI work must use the architecture above, and existing Phase 5 selectors should be migrated into colocated modules incrementally when those components are next touched.
