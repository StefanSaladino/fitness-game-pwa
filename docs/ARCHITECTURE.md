# Architecture

## Product/domain boundary

The active scoring model is `lifting-v1`. Lifting is primary; cardio is an accessory bonus. `docs/DOMAIN-RULES.md` is the behavioral source of truth.

## Layering

```text
React screen / feature component
        ↓
focused hook/controller
        ↓
feature service/repository
        ↓
Supabase

Pure lifting/scoring rules live separately in src/domain/.
```

Presentation components do not import Supabase and do not calculate authoritative XP.

## Scoring persistence

v0.3 introduces:

- `scoring_events`: authoritative lifting-v1 XP ledger target;
- `exercise_progress_observations`: canonical exercise performance observations;
- `exercise_progress`: current personal-best snapshot per user/exercise/metric.

The v0.2 `xp_events`, `performance_observations`, and `performance_benchmarks` tables remain only as migration history. New lifting-v1 scoring logic must not write to them.

Authoritative writes will be implemented server-side/database-side during the scoring persistence phase. Authenticated clients receive read access only to their own derived scoring/progression state.

## Canonical exercise identity

`exercise_catalog.id` is the stable identity for:

- workout exercise rows;
- exercise-completion scoring;
- progression observations;
- personal-best snapshots;
- future aliases/search labels.

Aliases such as RDL/OHP must resolve to canonical IDs and must never create separate progression identities accidentally.

## Weekly goals

Existing weekly target persistence now means **lifting days**. Cardio-only dates never satisfy the target.

## UI/CSS

Follow `docs/UI-ARCHITECTURE.md` and `docs/CSS-ARCHITECTURE.md`. New feature CSS is colocated with its feature/component rather than added to the legacy global stylesheet.


## Group application boundary

Group membership is many-to-many. The application never assumes a user belongs to exactly one group or that a group has four members.

`src/features/groups/` follows the standard feature layering:

```text
future group screen
      ↓
useGroups / useCreateGroup / useJoinGroup
      ↓
groupService
      ↓
Supabase RLS + existing group RPCs
```

Group creation uses the existing `groups` insert policy and database trigger that adds the creator as the active OWNER. Invite joining always uses `join_group_by_invite`; clients do not mutate membership rows directly.

## Security invariants

- users can mutate only their own raw workout rows through RLS;
- clients cannot directly write authoritative scoring/progression state;
- group permissions are role-controlled server-side;
- no client-supplied `qualifies`/XP value is trusted as authoritative;
- future concurrency/idempotency scoring work must reconcile duplicate, retry, edit, and delete cases.


## Group setup UI boundary

Phase 5.5B keeps group setup split into presentation and controller layers:

```text
CreateGroupForm / JoinGroupForm
        ↓
GroupSetupScreen
        ↓
GroupSetupController
        ↓
useCreateGroup / useJoinGroup
        ↓
groupService
        ↓
Supabase
```

`GroupGate` owns only the zero-vs-one-or-more membership transition. It does not collapse the data model to a single group. New group feature styles use CSS Modules colocated under `src/features/groups/components/`.


## Profile-picture boundary

`ProfilePicture` and `ProfilePictureManager` own presentation, `useProfilePicture` owns async UI state, and `profilePictureService` is the only Supabase boundary. New PFP styles are CSS Modules and do not add selectors to `global.css`.
