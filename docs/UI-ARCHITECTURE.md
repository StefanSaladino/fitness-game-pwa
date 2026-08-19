# UI Architecture and Responsive Contract

This document records the approved Phase 5 visual direction and the component boundaries used to implement it.

## Approved visual direction

The product owner reviewed concept layouts for:

- phone
- desktop
- smartwatch companion

The shared visual language is:

- dark charcoal / navy foundation
- cool blue for navigation and XP progression
- green/mint for success and workout-completion states
- restrained gradients on primary actions
- rounded cards with low-contrast borders
- strong information hierarchy without cartoon-style gamification

Concept-image content is directional, not product truth. In particular:

- **Nutrition is not part of the current product scope.** It must not appear in navigation.
- **Calories are not part of the current product scope.** They must not be added to workout summaries merely because a concept image showed them.
- Generated sample names, avatars, XP totals, badges, and leaderboard values are placeholders only.

## Responsive contract

### Phone: under 700px

- single-column content
- fixed bottom navigation
- primary actions may expand full width
- safe-area insets respected
- cards use compact spacing without reducing touch targets

### Tablet: 700px–1023px

- two-column content where it improves scanability
- bottom navigation remains the primary navigation pattern
- no permanent sidebar

### Desktop: 1024px and wider

- persistent left sidebar
- multi-column dashboard composition
- content width is bounded for readability
- navigation and account controls remain independent of feature content

### Very small browser widths

The PWA keeps a defensive tiny-width CSS contract so it does not catastrophically overflow. This is **not** the smartwatch product implementation.

### Smartwatch

The approved watch concept is reserved for a future native companion. Its likely responsibilities are glanceable progress, workout start/status, and completion feedback. Watch-specific logic and navigation must not be forced into React PWA components.

## Separation of concerns

```text
src/
  components/
    ui/                 reusable presentation primitives
    layout/             navigation and responsive shell
  features/
    auth/               authentication behavior/UI
    onboarding/         onboarding behavior/UI
    groups/             group behavior/UI
    dashboard/          dashboard feature composition when introduced
  domain/               framework-independent rules
  lib/                  infrastructure clients
```

### UI primitives

Current shared primitives:

- `Button`
- `Card`
- `Icon`
- `ProgressBar`
- `TextField`
- `SelectField`

Rules:

- no Supabase imports;
- no business/domain calculations;
- accessibility semantics are part of the primitive contract;
- variants are limited to demonstrated reuse rather than speculative component APIs.

### Layout components

Current layout components:

- `AppShell`
- `DesktopSidebar`
- `MobileNav`
- `PageHeader`

Rules:

- layout components receive navigation/account state through props;
- they do not query Supabase;
- they do not decide authorization;
- they do not calculate XP, weekly goals, or workout status;
- phone and desktop navigation use the same `primaryNavigation` model.

### Feature layers

Feature screens should follow:

```text
Screen / route composition
        ↓
Feature components
        ↓
Focused hook/controller
        ↓
Feature service/repository
        ↓
Supabase
```

Pure validation and scoring logic stays outside that async feature stack.

## Current implementation boundary

Phase 5.2 implements the shared design system and responsive authenticated shell only. The dashboard content shown inside it is a foundation preview, not the completed dashboard feature.

The next implementation slice may restyle and componentize authentication/onboarding using these primitives, but must not move Supabase calls into visual components.
