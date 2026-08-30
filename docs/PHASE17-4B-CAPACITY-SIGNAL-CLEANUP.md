# Phase 17.4B — Capacity dashboard signal cleanup

The Capacity page follows one rule: if Top Set cannot obtain an authoritative current value, that billing metric does not get a card.

Displayed:

- Database size — locally measured; Supabase Free limit is 500 MB per project.
- Postgres connections — locally measured; compared with the live `max_connections` setting (60 on the current Free/Nano project).
- Current project Storage bytes — locally measured. Supabase Free includes 1 GB organization Storage, but billing uses average GB-hours, so the page deliberately does not show a billing utilization percentage.

Removed from the dashboard:

- Storage object count — no Free-plan object-count quota.
- Total Auth users — no total-user quota.
- 30-day recent sign-ins — not the Supabase billing MAU definition.
- Monthly Active Users — 50,000 Free allowance, but authoritative current billing-cycle usage is not available through a documented provider API.
- Uncached egress — 5 GB Free allowance; authoritative current billing usage unavailable to the app.
- Cached egress — 5 GB Free allowance; same reason.
- Edge Function invocations — 500,000 Free allowance; authoritative billing-cycle usage unavailable to the app.
- Realtime messages — 2,000,000 Free allowance; authoritative billing-cycle usage unavailable to the app.
- Realtime peak connections — 200 Free allowance; authoritative billing-cycle usage unavailable to the app.

The service no longer invokes `platform-capacity-supabase`. Those omitted quotas remain release-runbook checks in the Supabase organization Usage page.
