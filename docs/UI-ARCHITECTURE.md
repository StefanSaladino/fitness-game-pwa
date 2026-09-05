# UI Architecture and Responsive Contract

Top Set is a mobile-first application. Desktop layouts are deliberate adaptations; they are not the source composition compressed onto a phone.

## Product UI principles

- prioritize the task a user is performing now;
- show real product data and real supported actions only;
- keep strong hierarchy without turning every region into an interchangeable card;
- use Top Set's current charcoal/orange visual system consistently but functionally;
- reserve imagery for places where it communicates identity/context rather than filling space;
- keep motion purposeful and respect `prefers-reduced-motion`;
- never encode scoring, authorization, or persistence decisions only in presentation state.

See [`UI-ANTI-AI-LAYOUT-RULES.md`](UI-ANTI-AI-LAYOUT-RULES.md) for additional visual guardrails.

## Shell ownership

The application shell owns:

- primary responsive gutter/content width;
- top application chrome;
- phone bottom navigation and safe-area accommodation;
- desktop navigation adaptation;
- route-level scroll ownership;
- shared system/notice surfaces.

Nested features must not create competing page gutters, document-level horizontal scroll, or duplicate global navigation.

## Responsive contract

### Phone

- single-primary-task composition;
- fixed/safe-area-aware bottom navigation where applicable;
- 320px-class widths must remain contained without horizontal page overflow;
- touch targets remain usable even when density increases;
- keyboard-open states must not hide the active input/action or create unreachable sheets.

### Tablet / intermediate widths

- use additional columns only when they improve comprehension;
- preserve the same feature/data model rather than inventing tablet-only behavior.

### Desktop

- bounded readable content widths;
- persistent navigation/operational rails where they improve efficiency;
- multi-column composition only when information relationships justify it.

## Feature layering

```text
screen / route composition
        ↓
feature components
        ↓
focused hook / controller
        ↓
feature service / repository
        ↓
Supabase
```

UI components do not call Supabase merely because they need data. Authorization is not inferred from whether a button is visible. Pure domain/scoring rules stay outside the React async stack.

## Shared components

Promote a component to shared UI only after genuine reuse is demonstrated. Shared primitives should own accessibility semantics and stable presentation contracts, not speculative feature APIs.

Feature-specific controls remain inside the feature until reuse is real.

## Active-workout density

Live lifting is a special density-sensitive surface. The useful viewport must account for safe areas, app chrome, active-workout timer/header, exercise context, bottom navigation, rest state, and the on-screen keyboard.

Completed sets may collapse into dense summaries while remaining reopenable/editable. Superset grouping must remain readable without forcing all members/sets to stay expanded.

Phase 18.8 performs the final cross-device density/polish pass after Superset recovery/history/presets and tracked-exercise picker refinements are integrated.

## Accessibility and interaction

For substantial UI work validate:

- semantic labels and accessible names;
- keyboard navigation/focus restoration;
- focus visibility;
- touch target size;
- non-color-only status communication;
- reduced motion;
- no hidden content behind fixed chrome/safe areas;
- loading, empty, error, offline/reconnecting, conflict, and success states where applicable.

## Native boundary

The PWA is not a simulated native watch/iOS/Android app. Phase 19 native shells and Phase 20 live workout surfaces consume explicit shared state/contracts rather than forcing native-only behavior into web presentation components.
