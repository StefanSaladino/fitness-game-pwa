# Phase 5.5B — Group Setup UI

## Objective

Give an onboarded user a real path into the social layer without mixing leaderboard/dashboard logic into setup.

## Flow

```text
Authenticated user
    ↓
Profile onboarding complete
    ↓
Load all active group memberships
    ↓
0 groups                     1+ groups
    ↓                            ↓
Create / Join setup          Continue to app
    ↓
Persist membership
    ↓
Reload memberships
    ↓
Continue to app
```

## Separation of concerns

- `CreateGroupForm` and `JoinGroupForm` own fields, local validation, and accessibility feedback.
- `GroupSetupScreen` owns only mode selection and presentation composition.
- `GroupSetupController` owns create/join async transitions through hooks.
- `GroupGate` loads memberships and decides only whether setup is required.
- Hooks delegate persistence to `groupService`.
- No group presentation component imports Supabase.

## CSS

All new group feature styles are colocated CSS Modules:

- `GroupSetup.module.css`
- `GroupGate.module.css`

No Phase 5.5B selector is added to `src/styles/global.css`.

## Multi-group invariant

The gate advances whenever the user has one or more active groups. It passes the complete `GroupSummary[]` downstream and never assumes exactly one group.

## Exit criteria

- create-group validation and submission works;
- raw invite code and invite URL joining works;
- successful membership mutation reloads persisted group state;
- zero-group users see setup;
- one-or-more-group users bypass setup;
- new CSS is colocated;
- TypeScript, Vitest, build, structural, E2E, and internal tests remain green.
