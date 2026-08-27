# Fitness Game PWA — v0.13.0

Current checkpoint: **Phase 15.9 messaging/social expansion is implemented on top of the complete Phase 16.10A offline composition patch**. It adds recipient inbox deletion and member-only group chat without changing scoring. The database-bearing work has not been applied to hosted Supabase, published, or deployed.

## Phase 15.9 messaging/social expansion

- Recipients can delete ordinary messages from only their own inbox; acknowledgement-required current revisions must be acknowledged first.
- Shared administrator message/revision/audit history and other recipient deliveries remain retained.
- Groups includes a dedicated Chat tab with a plain-text composer, emoji reactions, cursor pagination, live refresh, self-delete, and OWNER/ADMIN moderation.
- Chat uses membership-guarded RPCs over RLS-enabled, RPC-only tables.
- Private Realtime channels carry content-free invalidation only; clients re-fetch through current membership authorization.
- Chat, reactions, and inbox deletion have no scoring, XP, workout, progress, badge, or ranking effects.

See `docs/PHASE15.9-INBOX-DELETION-GROUP-CHAT.md`.

## Phase 16.10A cumulative slices

- Mobile composition owns the information order; desktop adapts the same hierarchy.
- The authenticated shell owns page gutters and the primary scroll region.
- Major Home and Settings categories use bounded surfaces and spacing rather than divider-only transitions.
- Settings uses a category index and focused drill-in panels.
- Every current dropdown uses the shared desktop-popover/mobile-bottom-sheet SelectField.
- Lift start, active timer/session state, exercise sections, set rows, picker, lifecycle confirmations, and recovery/conflict states now use explicit app surfaces and phone-first task order.
- Finish and Cancel are confirmation-gated; set rows require no horizontal scrolling at 320px; the picker behaves as an opaque full-height mobile route.
- Progress separates calendar summary, lift selection, selected-lift facts, trends, milestones, and history into contained app regions; charts and metric rows remain bounded at 320px.
- Cardio remains a lifting accessory with one primary quick-log task, then separate authoritative summary and history surfaces.
- Groups now separates roster, incoming/outgoing invitations, and settings into focused subviews; group context uses the shared selector instead of a horizontal rail.
- Competition now separates Standings from Activity, pins the signed-in member's standing, and contains leaderboard/feed/reaction rows at 320px.
- Authentication keeps its photographic identity but puts the active form in the first mobile viewport; onboarding separates Identity, Training preferences, and Goal into focused steps.
- Legal pages, Capacity, Users, Moderation, and Messages now share the Top Set surface/token system and retain one-pane phone/two-pane desktop task behavior.
- Loading/error/empty states, PWA notices, and platform messages use shared bounded surfaces and top-chrome/sheet behavior without competing unread bottom banners or covering Settings.
- Home, Lift start, Cardio, Progress, Groups, and Compete use compact bounded destination photography; active workout and operational screens stay visually focused.
- Product destinations have canonical direct paths (`/lift`, `/cardio`, `/groups`, `/progress`, `/compete`) in addition to Home.
- Mobile Messages, Settings, and Sign out are separate one-tap header actions; Settings also keeps Sign out in its account summary.
- Admin Overview reads real project telemetry through the existing guarded Supabase RPCs. Netlify capacity invocation is deferred until explicitly enabled later.
- Vertical scrolling remains native, mobile scrollbar chrome is hidden, and horizontal document overflow is prohibited.
- These slices change no scoring, authorization, persistence, database schema, RLS, RPC, hosted Supabase state, or deployment state.

See `docs/PHASE16.10A-APP-COMPOSITION-RESET.md`.

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
