# Phase 16.3 — Final visual pass

## Purpose

This pass adds visual energy without turning Top Set into a marketing page or violating the anti-AI layout policy.

Competitive references were used only for broad layout principles:

- strong athlete photography can act as a single visual anchor;
- primary task content remains immediately reachable;
- bottom navigation stays persistent and simple;
- imagery should support a real page state rather than create a decorative card wall.

## Page treatment

### Profile setup

The existing full-width gym photograph remains the visual anchor.

The image now has a thin Top Set orange boundary into the form area. No second banner or decorative card is added because the photo itself already performs that role.

### Groups — zero memberships

A compact photographic banner now leads the page.

The supplied battle-rope athlete photograph is deliberately cropped to the right side so the left side can carry grounded state copy:

- `GROUPS`;
- `Groups are optional.`;
- the real solo/shared-competition explanation.

The real Create group form follows immediately below.

### Groups — pending invitation

The same banner composition is reused as a state header, but the copy changes to `INVITATIONS` and explains additive membership.

The actual invitation data remains below in the task surface.

### Loading

The loading screen remains intentionally minimal. Adding a photography banner to a transient loading state would make it behave like a splash advertisement and would delay visual comprehension.

## Multi-group correction

The selected group is now persisted locally per signed-in user.

- the preference key is user-scoped;
- only an ID that still exists in the current membership list is restored;
- removed memberships fall back to the first current membership;
- no-group state clears the saved value;
- storage failure does not break the in-memory session selection.

This does not add a database column or change group membership semantics.

The existing Groups and Compete selectors remain the real controls for switching group context. Future Phase 16.4/16.8 design work should make selected group context visible anywhere group-derived data is shown.
