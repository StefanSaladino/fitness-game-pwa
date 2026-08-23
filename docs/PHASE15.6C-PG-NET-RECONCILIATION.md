# Phase 15.6C — pg_net reconciliation

Status: **DONE**

Hosted migrations:
- `20260823191313_phase15_6c_reconcile_pg_net_extension`
- `20260823191540_phase15_6c_push_foreign_key_indexes`

Hosted reconciliation pgTAP: **14/14 passed**, rollback-safe.

## Reason

The initial Phase 15.6C migration enabled pg_net without an explicit extension schema. Supabase Security Advisor therefore reported `extension_in_public_pg_net`.

The already-applied migrations remain immutable. The reconciliation migration follows current Supabase guidance: it confirms the pg_net request queue is empty, recreates pg_net under `extensions`, and verifies the application-owned private dispatch boundary and retry cron remain intact.

## Managed pg_net permissions

The live catalog confirms pg_net runtime objects are owned by Supabase's internal `supabase_admin` role. Supabase also installs a platform event trigger that applies its supported pg_net grants when the extension is created.

Application migrations do not take ownership of or override those Supabase-managed ACLs. The Fitness Game security boundary remains the `private` schema: browser roles cannot use that schema, cannot execute the private push dispatcher, and cannot read the private push runtime configuration.

## Verification

After reconciliation:
- pg_net reports extension namespace `extensions`;
- the hosted retry cron remains active;
- the private dispatcher can still invoke pg_net;
- the deployed push Edge Function returned **HTTP 200** in the post-repair smoke test;
- Security Advisor no longer reports `extension_in_public_pg_net`.

The first Performance Advisor pass also identified two Phase 15.6C foreign keys without leading indexes. `20260823191540_phase15_6c_push_foreign_key_indexes` adds indexes for `push_delivery_queue.target_subscription_id` and `push_delivery_targets.subscription_id`; those foreign-key findings then disappeared. Immediate unused-index INFO notices are expected before real workload exercises new indexes.

## Regression coverage

`supabase/tests/040_phase15_6c_pg_net_reconciliation.test.sql` contains **14** assertions covering:
- extension placement outside `public`;
- pg_net runtime API availability;
- private dispatcher existence and pinned security-definer boundary;
- browser denial on the private schema/dispatcher;
- private runtime-table denial;
- exact active retry cron;
- rollback-safe invocation of the recreated pg_net API.

This repair preserves the project's hosted-Supabase, no-Docker architecture.
