# Fitness Game PWA — v0.13.0

Current checkpoint: **Phase 15.2 — capacity + platform-health foundation is in progress**. Phase 15.2A defines capacity semantics/provider contracts, and the administrator route, Profile/Settings discovery, notification-settings architecture, and CI validation boundaries are now locked before database telemetry/UI implementation.

## Phase 15.1 highlights

- Platform administrators are completely separate from group OWNER / ADMIN roles.
- Operational account state, platform-admin membership, and audit history live in a non-exposed `private` schema.
- The browser never receives a service-role key or direct access to private admin tables.
- A one-time operator-only bootstrap creates the first trusted platform administrator.
- Subsequent grant/revoke operations are authenticated RPCs that authorize the actor inside security-definer boundaries.
- Suspended platform admins lose active administrative access.
- The final active platform administrator cannot be revoked, suspended, or deleted through the protected data boundary.
- Platform-admin bootstrap/grant/revoke actions append actor/target/reason/before/after audit records; audit rows reject UPDATE and DELETE.
- Authenticated product sections now load lazily from direct controller modules so workout, progress, social, cardio, group administration, and dashboard code do not all enter the initial app chunk.
- The initial app imports `GroupGate` directly rather than through the groups barrel, preserving a real group-administration lazy boundary.
- Vite 8 uses Rolldown code-splitting groups for React and Supabase vendor code.
- Production builds now fail if any emitted JavaScript chunk exceeds 500 kB.
- The build emits an asset manifest and the service worker precaches every emitted app asset, so feature-level lazy loading does not weaken the installed PWA offline shell.


## Phase 15.2 foundation

- Capacity states use 60% WATCH, 75% WARNING, 85% CRITICAL, and 100%+ EXCEEDED planning bands.
- `/platform-admin` and `/platform-admin/capacity` are reserved for ACTIVE platform administrators and branch before the ordinary group gate.
- Unauthorized authenticated callers hitting `/platform-admin/*` receive the same replace redirect to `/` as an unknown authenticated route, with no admin-specific denial UI.
- `/settings` is the ordinary authenticated Profile/Settings surface; only positively confirmed ACTIVE platform administrators see the in-PWA Admin entry.
- Profile/Settings reserves identity, training, notifications, account/security, groups, privacy/data, PWA status, and conditional Administration sections.
- Notifications include a server-persisted master ON/OFF preference plus supported category toggles; device/browser notification permission remains separate.

## GitHub CI

GitHub now runs separate application, browser, and database gates. The database job reconstructs the project from migration zero on an isolated GitHub-hosted Docker/Supabase stack and explicitly selects only canonical `supabase/tests/*.test.sql` pgTAP suites. The normal developer workflow does **not** require Docker. See `docs/CI-VALIDATION.md`.

## Supabase for v0.13.0

Apply:

```text
supabase/migrations/20260822000300_platform_admin_authorization_audit.sql
```

Then run:

```text
supabase/tests/028_platform_admin_authorization_audit.test.sql
```

After the migration succeeds, bootstrap the first platform administrator once from the Supabase SQL Editor. See `docs/PHASE15.1-PLATFORM-ADMIN-AUTH-AUDIT.md` for the exact query and verification steps.

No Phase 15.2 capacity dashboard, user suspension UI, account deletion UI, or admin messaging UI is included yet.

## Validation

Run the complete checkpoint gate before committing:

```powershell
npm install
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

`npm install` also synchronizes the root `package-lock.json` version to `0.13.0`; include that generated lockfile change in the commit.

See `docs/ROADMAP.md` and `docs/PHASE15.1-PLATFORM-ADMIN-AUTH-AUDIT.md`.
