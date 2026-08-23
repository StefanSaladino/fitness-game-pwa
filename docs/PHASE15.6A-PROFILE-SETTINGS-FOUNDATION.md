# Phase 15.6A — Profile/Settings foundation

Status: **DONE**

Phase 15.6A turns the canonical authenticated `/settings` route into the ordinary user account surface defined by the locked Phase 15.6 contract. It remains reachable before `GroupGate`, does not add an administrator role, does not change scoring, and does not require Docker.

## Delivered surface

- Profile picture management through the existing Storage-backed profile-picture service.
- Editable display name and username through a dedicated settings service and authoritative RPC.
- Auth-sourced email and account-created context without copying email into `public.profiles`.
- Timezone, next-boundary weekly lifting target, and a persisted `KG` / `LB` display/input preference.
- Password change through Supabase Auth's authenticated `updateUser` flow and ordinary sign-out.
- Current group summaries, pending-invitation count, and direct navigation to the existing Groups controller rather than duplicated role controls.
- Privacy/data copy that does not pretend data export exists.
- A deliberate two-step self-deletion control using the Phase 15.3C request/cancel/confirm boundary, group-owner guidance, and the exact server-derived `DELETE <username>` phrase.
- Immediate browser-local sign-out after the irreversible server deletion succeeds.
- Existing PWA lifecycle state for version, connectivity, installed/standalone mode, offline-storage persistence, install availability, and update availability.
- Administration discovery only after the existing access service positively confirms an ACTIVE platform administrator.

The Notifications section is present as honest roadmap context but exposes no switch in this slice. Account-level notification persistence and delivery semantics begin in 15.6B; required in-app account/security/moderation messages remain unaffected.

## Database boundary

Migration `20260823162857_phase15_6a_profile_settings_foundation.sql` adds `profiles.preferred_weight_unit` with a `KG` default and a strict `KG` / `LB` constraint. The value affects display and input only; workout rows remain canonical kilograms.

`public.update_my_profile_settings(text,text,text,smallint,text)`:

- requires `private.require_active_account()`;
- derives the target user only from the authenticated caller;
- validates username, uniqueness, display name, IANA timezone, weekly target, and weight unit server-side;
- schedules a changed weekly target for the next Monday in the updated timezone or cancels a pending change when the current target is selected;
- never mutates `weekly_goals`, workouts, scoring events, badges, or rankings;
- runs as a pinned-search-path `SECURITY DEFINER` function with explicit authenticated-only execution.

Direct authenticated updates to `username`, `display_name`, and `timezone` are revoked. The existing narrow `profile_picture_path` update grant remains because its dedicated Storage service and ownership policies continue to own that lifecycle.

## Validation

`037_phase15_6a_profile_settings_foundation.test.sql` is a rollback-safe 31-assertion pgTAP suite covering schema/defaults, explicit grants, direct-write denial, self-only updates, normalization, next-boundary target behavior, cancellation, validation failures, suspended-account rejection, pinned search path, and zero scoring/history effects.

Application tests cover the typed service/hook, password provider boundary, all ordinary Settings sections, no fake notification/export control, persisted profile choices, exact deletion confirmation/cancellation, local sign-out after deletion, group status, PWA status, and fail-closed Administration discovery.

Hosted advisors report no ERROR findings and no Phase 15.6A performance finding. The security advisor reports the expected signed-in `SECURITY DEFINER` warning for `update_my_profile_settings`; that execution grant is intentional because this is the authenticated self-service RPC, and its caller identity, active-account requirement, validation, target row, search path, and direct-column denial are all enforced and covered by pgTAP. Existing private-table no-policy INFO items and intentional authenticated RPC warnings remain unchanged in nature. See the [Supabase database linter reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The complete gate remains:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
npm run db:test:ci
```
