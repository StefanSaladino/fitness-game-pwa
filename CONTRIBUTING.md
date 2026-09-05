# Contributing to Top Set

Top Set is developed in small, independently testable vertical slices. Keep changes easy to review, validate, and bisect.

## Engineering boundaries

### Application layering

Use this direction of dependency:

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

Pure domain rules and calculations belong under `src/domain/` and must not depend on React, Supabase, or browser APIs.

Presentation components render state and emit user intent. They do not own authoritative persistence, scoring, authorization, or cross-feature orchestration.

Services/repositories own infrastructure communication. Avoid leaking raw database-row shapes through the component tree when a focused model or mapping boundary is appropriate.

### CSS

- global styles are limited to tokens, reset/base behavior, and truly shared utilities;
- reusable components own colocated styles;
- feature styles stay with the feature;
- page/screen styles own composition, not feature internals;
- do not add feature selectors to a catch-all global stylesheet.

See `docs/CSS-ARCHITECTURE.md`.

### Database changes

- migrations are immutable after they are committed/applied;
- fixes use a new timestamped migration;
- authorization and integrity rules belong server-side, not only in the browser;
- browser code must never receive privileged credentials;
- database-bearing slices require hosted migration verification and the relevant hosted pgTAP tests in addition to repository contract validation.

See `docs/SUPABASE-SETUP.md` and `docs/DATABASE.md`.

## Small-slice delivery

A development slice should have one primary behavior boundary, explicit non-goals, focused tests, and a clear exit condition.

Do not combine unrelated features, broad cleanup, schema changes, and UI redesigns in one feature patch. Cleanup discovered during a slice should be included only when it directly affects that boundary or correctness; otherwise schedule it separately.

Prefer checkpoint commits that can be understood and reverted independently.

## UI work

For substantial user-facing changes:

1. define the user goal, data, actions, and all important states;
2. establish the mobile-first hierarchy before styling;
3. use a concept/review checkpoint when the change materially alters layout or interaction;
4. define responsive, safe-area, scrolling, and keyboard behavior;
5. implement with semantic HTML and accessibility from the start;
6. validate 320px containment, current phone sizes, desktop, keyboard/focus behavior, and relevant browser engines.

Do not invent fake metrics or decorative product behavior to satisfy a visual concept. Real data and existing domain rules remain authoritative.

## Testing

Write tests at the layer that owns the behavior:

- pure rules → unit tests;
- components/interactions → React Testing Library;
- services/controllers → focused service/controller tests;
- RLS/RPC/data invariants → pgTAP;
- cross-feature user flows → integration/E2E.

Use `docs/CI-VALIDATION.md` as the single validation source of truth.

## Documentation policy

`docs/README.md` maps canonical documentation.

Rules:

- one current source of truth per topic;
- update the relevant canonical document when behavior or operating procedure changes;
- completed `docs/PHASE*.md` files are historical decision/implementation records, not competing current setup instructions;
- do not commit patch manifests, temporary handoff files, hotfix READMEs, copied validation instructions, or scratch notes;
- use Git history and `CHANGELOG.md` for delivery history;
- prefer primary vendor documentation when external behavior is relevant.

## Before closing a slice

Run focused tests first. Before a phase/release checkpoint, run the full acceptance gate from `docs/CI-VALIDATION.md` and verify any required hosted Supabase work separately.
