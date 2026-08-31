# Phase 17 — Release Readiness & Rollout

Status: **IN PROGRESS**

Release target: first hosted Top Set production rollout using **Supabase Free** and **Netlify Free**.

## Release rule

Phase 17 is a feature freeze. Until launch, accepted changes are limited to visual/layout/accessibility repair, the explicitly approved Phase 17.2C global All-Time leaderboard, release-reset safety, provider capacity telemetry, deployment configuration, production validation, and defects discovered by those gates.

## 17.1 — Exhaustive visual audit harness — COMPLETE

Goals:

- Inspect every deterministic application surface and major state.
- Run every surface at canonical phone, landscape phone, tablet, desktop, and short-desktop viewports.
- Run each surface at `breakpoint - 1`, `breakpoint`, and `breakpoint + 1` for the CSS breakpoints relevant to that feature.
- Capture full-page screenshots for manual review.
- Fail on document horizontal overflow or visible interactive controls escaping the viewport.
- Audit the declared admin scroll owner and prove the bottom of vertically overflowing content is reachable.
- Attach geometry diagnostics for clipped text and undersized mobile controls so they can be manually inspected without pretending every intentional ellipsis is a defect.

Current implementation:

- `playwright.visual.config.ts`
- `tests/e2e/visual-audit.spec.ts`
- `tests/e2e/releaseVisualAuditHarness.tsx`
- `release-visual-audit.e2e.html`
- `npm run test:e2e:visual`

The visual-audit matrix is intentionally separate from the normal three-browser behavioral E2E suite so ordinary development remains fast.

## 17.2 — Visual remediation + scroll architecture — COMPLETE

- Execute the visual audit locally with Playwright browser binaries installed.
- Review every generated screenshot and `geometry.json` attachment.
- Repair styling inconsistencies, overlap, collisions, unreadable wrapping, clipped controls, hidden scroll paths, modal/sheet containment, and unsafe short-viewport layouts.
- Give desktop platform administration one explicit viewport-constrained vertical scroll owner while leaving the rail independently usable.
- Add focused regressions for each defect found.
- Re-run the complete visual audit until there are no known visual defects.

Exit gate: full visual matrix executed and manually reviewed with no unresolved defect.

## 17.2C — Global All-Time leaderboard — COMPLETE

This is the only product-rule exception to the Phase 17 feature freeze.

- Remove `ALL_TIME` rankings from group competition surfaces; groups remain weekly competition contexts.
- Add one read-only app-global All-Time leaderboard backed by authoritative user-level lifetime scoring.
- Rank all eligible active, onboarded app users globally, independent of group membership.
- Display the global Top 10.
- Display the signed-in user’s true global rank in a visually detached row beneath the Top 10, including when the user is already present in the Top 10.
- Do not expose group chat, global chat, feed, reactions, reports, or other social actions on the Global All-Time leaderboard.
- Keep a workout/scoring event user-scoped and counted once; the same user-level score may contribute to weekly standings in every active group and to one global lifetime rank.
- Use a dedicated global read contract/RPC rather than overloading the group leaderboard with a fake group identifier.
- Cover the contract with database, service/unit, structural, E2E, and visual regressions.
- Remove stale group-All-Time tests, fixtures, and options from current product code while preserving historical migrations/docs as history.

Exit gate: group competition exposes no All-Time mode, the global Top 10/current-user rank is authoritative and deterministic, no chat/social affordance exists on the global board, and targeted release gates pass.

## 17.2D — Scoring scale hardening — IMPLEMENTED LOCALLY, HOSTED VALIDATION PENDING

- Reconcile only the affected scoring-date suffix after historical workout edits while preserving full authoritative rebuild parity.
- Bound client mutation replay to 30 days and completed server receipt retention to 90 days without purging active-workout receipts.
- Keep the full authoritative reconciler unchanged as the correctness oracle.
- Apply only `20260830210000_phase17_scoring_scale_hardening.sql` after a hosted rollback dry run proves canonical suite 046 and all changes disappear on rollback.

Exit gate: rollback and installed-migration pgTAP parity both pass on hosted Supabase, cron/function/permission state is verified, and advisors are reviewed.

## 17.3 — Production statistics reset mechanism — IMPLEMENTED, VALIDATION IN PROGRESS

Build and test a release-only, explicitly destructive reset procedure. Do **not** execute it during implementation.

Current implementation:

- `supabase/release/phase17-production-statistics-reset.sql` is an operator-only reset script, not a migration. It requires an explicit launch confirmation and remains `ROLLBACK`-only in source control.
- The reset scope covers workouts/sets, mutation receipts, XP/scoring, exercise/performance observations and summaries, weekly goal/snapshot/consistency state, earned badges, and derived group activity reactions.
- `public.performance_benchmarks` is reset because it is per-user benchmark summary state, not a static benchmark-definition table.
- Accounts, profiles/training preferences, notification preferences, groups/memberships/invites, group chat/reactions, platform/admin/moderation history, exercise catalogue, push configuration, and provider capacity configuration/history remain outside the delete allowlist.
- Workout browser persistence advances to epoch `2`, using a new IndexedDB database namespace and `v2` recovery/mutation keys. Known v1 localStorage fallbacks are retired instead of migrated.
- `supabase/tests/044_phase17_3_release_reset_contract.test.sql` proves the destructive scope and representative preservation contract inside a transaction that always rolls back.
- `scripts/validate-phase17-3-release-reset.cjs` keeps the operator SQL and pgTAP delete allowlists identical and fails if protected tables enter the reset scope or the checked-in SQL becomes commit-capable.
- `docs/PHASE17-3-PRODUCTION-RESET-RUNBOOK.md` documents the Phase 17.8 backup/dry-run/commit prerequisites.

Exit gate: targeted unit/E2E/structural/database gates pass, rollback-safe tests prove the reset scope and preservation contract, persistence epoch 2 ignores pre-release durable state, and production reset remains unexecuted.

## 17.4 — Measurable Supabase capacity — IMPLEMENTED LOCALLY, HOSTED VALIDATION PENDING

- Keep the corrected Capacity surface limited to three authoritative project signals: database size, Postgres connections, and project Storage.
- Keep the verified 500 MB database allowance server-owned in the corrected migration.
- Do not show invented provider percentages, unavailable-provider cards, Auth-user proxies, or unused provider/Netlify network paths.
- Apply only `20260829194000_phase17_4_supabase_free_capacity.sql` after migration-history reconciliation, then run canonical suite 045 against hosted Supabase.
- Add Nano CPU/memory/compute telemetry later only if an authoritative secured source is available.

Exit gate: the corrected migration and pgTAP pass on hosted Supabase, the three live signals render correctly, and Security/Performance advisors are reviewed.

## 17.5 — Netlify hosting + production configuration — NOT STARTED

- Add/verify `netlify.toml`, build/publish contract, SPA fallback, cache behavior, security headers, and PWA asset handling.
- Connect the GitHub repository to Netlify.
- Configure only public browser-safe Vite environment values in Netlify.
- Configure production Supabase Site URL and allowed auth/reset/verification redirects.
- Deploy a preview first, then run remote E2E/PWA/auth/direct-route checks before production promotion.

Exit gate: an approved Netlify deploy preview passes production-like checks.

## 17.6 — Netlify Free-plan capacity implementation — NOT STARTED

- Verify the current Netlify Free-plan quota model from official Netlify documentation immediately before implementation.
- Configure the existing server-side Netlify provider boundary using the real account/site identifiers and server-held provider credential.
- Prefer the actual account-level Free-plan limiting resource as the primary capacity metric.
- Show bandwidth/request/deploy/compute contributors only when they are authoritative and useful.
- Never reconstruct an unavailable account balance from incomplete client-side traffic data.

Exit gate: Platform Overview shows trustworthy Netlify Free-plan usage/limits or explicit unavailable states from the live deployed account.

## 17.7 — Release-candidate gate — NOT STARTED

Required repository gates:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
npm run db:test:ci
npm run test:e2e
npm run test:e2e:admin-layout
npm run test:e2e:visual
```

Also require hosted pgTAP, Supabase advisors, Edge Function verification, deployed-Netlify smoke/E2E, authentication/reset verification, Realtime/group-chat verification, PWA install/offline/update behavior, secret/environment audit, security headers, and direct-route refresh checks.

## 17.8 — Production reset + launch — NOT STARTED

Only after the release candidate is frozen and green:

1. Create a manual pre-reset backup/export appropriate to the current Supabase plan.
2. Record pre-reset row counts and the exact release commit.
3. Execute the tested statistical reset.
4. Bump/invalidate pre-release local persistence state.
5. Verify zeroed statistics and preserved accounts/configuration.
6. Deploy the exact approved commit to production.
7. Verify production authentication, training, groups/chat, admin, telemetry, PWA/offline behavior, and direct routes.
8. Record the first clean production capacity snapshot.
9. Tag the production release only after verification.

## 17.9 — Initial production monitoring — NOT STARTED

Watch capacity, provider failures, auth failures, workout mutation/reconciliation failures, Realtime disconnects, push failures, and unexpected admin errors during initial rollout. Escalate before either Free-plan hard limit threatens availability.
