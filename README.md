# Fitness Game PWA — v0.13.0

Current checkpoint: **Phase 15.1 — platform-admin authorization + audit foundation**. The release adds a secure operational authorization boundary for future platform administration and fixes the oversized production bundle without adding an administrator screen yet.

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
