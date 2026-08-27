# Top Set Fitness PWA — Phase 15.9 Hosted-Validated Cumulative Overlay v8

Prepared: 2026-08-27

## Baseline

- Published repository baseline: `c05bd04c553da2e797330e95d2754386a87639f1`
- Local reconstruction checkpoint: `679822f0008d90446185b243d3441bacc6726fc7`
- Archive type: repository-root overlay

## Included cumulative slices

- Phase 16.10A.1 — shared app shell, Home, Settings, and responsive selects
- Phase 16.10A.2 — Lift start, active workout, exercise picker, and recovery states
- Phase 16.10A.3 — Progress and Cardio
- Phase 16.10A.4 — Groups, Competition, and Social
- Phase 16.10A.5 — Authentication, Onboarding, Admin, Legal, and shared system states
- Phase 16.10A.6 — destination media, canonical routes, header access, live Supabase Overview, deferred Netlify, and test repair
- Phase 15.9 — recipient inbox deletion and member-only group chat

This cumulative overlay contains 167 repository files plus this manifest. It is intended to be extracted over a clean checkout of the published baseline above. It contains no deleted-file operations.

## Phase 15.9 outcome

- Recipient-only platform inbox deletion with explicit confirmation
- Current acknowledgement-required revision must be acknowledged before deletion
- Shared message content, revision history, administrator audit, delivery identity/progress, and other recipients remain retained
- Dedicated Groups Chat tab, separate from automated Competition activity
- Plain-text 1–1,000 character composer, cursor pagination, and responsive 320px containment
- FIRE, STRONG, CLAP, HEART, and LAUGH reactions with one selection per member/message
- Author self-delete and group OWNER/ADMIN moderation via body-free tombstones
- Active-account plus current-membership authorization on every chat read/write RPC
- RPC-only RLS tables, duplicate protection, ten-message rolling-minute rate limit, and zero scoring effects
- Private Realtime Broadcast membership policy with content-free invalidation and authoritative RPC re-fetch
- Updated documentation, static database guards, component/integration coverage, and deterministic browser fixtures

## Hosted database artifacts

- `supabase/migrations/20260827195328_recipient_inbox_deletion.sql`
- `supabase/migrations/20260827195329_group_chat.sql`
- `supabase/migrations/20260827222849_group_chat_foreign_key_indexes.sql`
- `supabase/tests/041_recipient_inbox_deletion.test.sql` — 27/27 hosted assertions passed
- `supabase/tests/042_group_chat.test.sql` — 45/45 hosted assertions passed

All three migrations are applied to the Top Set hosted project and recorded at the exact repository versions. Hosted types were regenerated and Security/Performance advisors were reviewed. Realtime public-channel access remains an operator Dashboard check before release.

## Verification

- Unit: 493/493 passed across 135 files
- Integration: 22/22 passed across 6 files
- TypeScript: passed
- Production Vite build: passed
- Bundle budget: passed; 24 JavaScript chunks, largest 189.60 kB
- Structural validation: passed; 370 TypeScript/TSX sources parsed
- Phase 16.10A composition contract: passed, including inbox deletion and group chat containment guards
- Internal lifting oracle: 62/62 assertions passed
- Static database contract: 45 migrations and 43 canonical pgTAP suites passed
- Hosted Phase 15.9 pgTAP: 72/72 assertions passed in rollback-safe transactions
- Playwright: 57 cases collected across desktop Chromium, Android Chromium, and iPhone/WebKit

Live Playwright execution is not claimed because this workspace does not include the required Playwright browser binaries.

## Safety boundary

- Nothing was pushed, committed, tagged, or deployed to an application host or remote repository.
- Hosted Supabase changes were limited to the three named migrations, rollback-safe pgTAP execution, read-only verification/advisor/log queries, and database-type generation.
- No Realtime project setting was changed; public-channel access still requires a Dashboard check before release.
- No real environment file, dependency lockfile, dependency directory, build output, provider credential, or secret is included.
- No package dependency was added or changed.
- No scoring, XP, workout, progression, badge, or ranking rule changed.
