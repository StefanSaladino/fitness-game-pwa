# Phase 19 Capacity and Retention Validation

Status: **Measured on hosted Supabase, 2026-09-21**

This record captures the Phase 19.9 capacity/retention measurements used for the
release decision. It is a measurement record, not a forecast of user growth.

## Release conclusion

The current Phase 19.9 retention design remains appropriate for release:

- retain compact structured monthly report snapshots long-term;
- retain only the latest verified PDF artifact per user;
- do not introduce destructive raw-workout cleanup in Phase 19;
- continue measuring real active-user growth before changing snapshot retention;
- treat provider billing-cycle usage as an operator metric reviewed in Supabase
  Usage, not as a value reconstructed by application SQL.

No aggressive data-retention change is justified by the current hosted dataset.

## Hosted baseline

Measured hosted project values:

| Metric | Measurement |
|---|---:|
| PostgreSQL database size | 34,352,275 bytes (~32.76 MiB) |
| Free-plan database allowance | 500 MB per project |
| Approximate database utilization | 6.55% |
| Approximate database headroom | 467.24 MiB |
| Auth users | 7 |
| Frozen monthly source snapshots | 3 |
| Retained monthly PDF artifact rows | 1 |
| Monthly-report Storage objects | 1 |
| Monthly-report Storage bytes | 5,818 bytes |
| All project Storage objects | 2 |
| All project Storage bytes | 5,336,000 bytes (~5.09 MiB) |

Supabase documents the current Free-plan allowances as 500 MB database size per
project, 1 GB Storage, 50,000 MAU, 500,000 Edge Function invocations, 2 million
Realtime messages, and 200 peak Realtime connections. Current billing-cycle
organization usage for MAU, egress, Edge Functions, and Realtime must be read
from the Supabase Usage page rather than inferred from these project-local
measurements.

Primary vendor references:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/database-size
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
- https://supabase.com/docs/guides/platform/manage-your-usage/egress

## Current Phase 19.9 relation footprint

Current physical relation sizes are dominated by PostgreSQL page/index minimums
because the tables are intentionally tiny:

| Relation | Rows | Heap | Indexes | Total |
|---|---:|---:|---:|---:|
| monthly_training_report_source_snapshots | 3 | 8 KiB | 80 KiB before 19.9D cleanup | 96 KiB |
| monthly_training_report_muscle_snapshots | 39 | 16 KiB | 48 KiB | 96 KiB |
| monthly_training_report_performance_snapshots | 65 | 24 KiB | 80 KiB | 144 KiB |
| monthly_training_report_pdf_artifacts | 1 | 8 KiB | 48 KiB | 64 KiB |

These current relation sizes are **not** used as per-user extrapolations because
small PostgreSQL relations are page-allocation dominated.

## Controlled scale measurement

A temporary PostgreSQL scale model was created and dropped in the same hosted
session. It used the production column shapes and indexes with:

- 1,000 user-month parent snapshots;
- 13 muscle rows per user-month;
- 50 frozen normalized performance observations per user-month;
- 1 retained PDF artifact pointer per user.

Measured totals:

| Component | Rows | Total DB bytes |
|---|---:|---:|
| Parent snapshots | 1,000 | 573,440 |
| Muscle snapshots | 13,000 | 3,284,992 |
| Performance snapshots | 50,000 | 18,112,512 |
| Latest PDF artifact pointers | 1,000 | 745,472 |

The long-term structured monthly source therefore measured about **20.95 MiB
per 1,000 user-months** at 50 frozen performance observations per month.

That is about **21.46 KiB per user-month** in this controlled shape.

The latest-PDF pointer is not monthly historical growth; it is one row per user.

## Sensitivity to performance-observation density

The controlled measurement can be approximated as:

```text
structured bytes per user-month
~= 3,858 bytes fixed parent+muscle footprint
 + 362 bytes per frozen performance observation
```

Approximate measured scenarios:

| Frozen performance observations | Structured DB per user-month |
|---:|---:|
| 25 | ~12.6 KiB |
| 50 | ~21.5 KiB |
| 100 | ~39.1 KiB |
| 200 | ~74.5 KiB |

This is capacity planning arithmetic from the controlled test shape, not a
promise that production users will generate a particular observation count.

## Free-plan headroom scenario

At the current database size, approximately 467.24 MiB remains below the
500 MB Free-plan database-size threshold.

At the controlled 50-observation density:

- 1,000 continuing monthly-active users add about 20.95 MiB of structured report
  history per month;
- 12 months for those 1,000 users is about 251 MiB;
- if every other database table stopped growing, current headroom would cover
  roughly 22 such months;
- about 1,858 continuously active users at that density for 12 months would use
  the current measured headroom.

These are intentionally conservative planning scenarios and exclude growth from
workouts, groups, messaging, moderation, Auth metadata, other indexes, and other
application tables. They are **not** user-capacity forecasts.

## PDF Storage and egress

The hosted E2E PDF is 5,818 bytes. With latest-only retention:

- 1,000 retained PDFs at that exact size would be about 5.55 MiB;
- 10,000 retained PDFs would be about 55.5 MiB.

The PDF artifact therefore has a much smaller persistent footprint than the
long-term structured PostgreSQL snapshots.

A download of the current sample PDF transfers about 5.8 KiB. Even 10 downloads
per month by 1,000 users would be only about 55.5 MiB of PDF Storage egress.
However, Supabase unified egress also includes Database, Auth, Storage, Edge
Functions, Realtime, and other services, so actual billing-cycle egress must be
reviewed on the Supabase Usage page.

## Query behavior

Hosted report reads were measured on the QA dataset:

- parent frozen-source lookup uses the unique `(user_id, period_start)` index;
- retained PDF lookup uses the `user_id` primary key;
- tiny muscle/performance relations currently choose sequential scans because
  scanning a few pages is cheaper than index traversal;
- current measured report reads are sub-millisecond on the hosted QA dataset;
- child-table snapshot/user indexes remain in place for scale and RLS/FK access.

Phase 19.9D removes the redundant non-unique source `(user_id, period_start
DESC)` index because the unique `(user_id, period_start)` B-tree supports the
same equality lookup and can scan backward for descending month navigation.

## Advisor review

After Phase 19.9D hardening:

- the Supabase Security Advisor reports no Phase 19.9 report-specific findings;
- public PDF lifecycle RPCs are SECURITY INVOKER wrappers;
- privileged implementations live under `report_private` as non-exposed
  SECURITY DEFINER helpers and derive ownership from `auth.uid()`;
- remaining report-related Performance Advisor entries are INFO-level unused
  index notices on a very small dataset. The retained indexes support
  foreign-key/cascade or future scaled access patterns and are not removed based
  solely on early zero-use counters.

## Retention decision

Phase 19 keeps the locked retention contract:

1. structured monthly snapshots are retained long-term;
2. only the latest verified monthly PDF is retained per user;
3. old PDF deletion happens only after verified replacement promotion;
4. failed replacement keeps the prior valid PDF;
5. historical PDFs can be regenerated from frozen snapshots without becoming
   retained artifacts when a newer retained month exists;
6. raw workout history is not deleted or compacted by Phase 19.

Before considering future structured-snapshot compaction, collect real
production measurements for active-user counts, average frozen performance rows
per user-month, database growth, and product requirements for historical
re-rendering.

## Provider billing-cycle usage check

Recorded from the Supabase organization Usage page on 2026-09-21 for the
current 2026-09-18 through 2026-10-18 billing cycle, with **All projects**
selected:

| Provider metric | Current usage | Included quota |
|---|---:|---:|
| Database size | 0.05 GB | 0.5 GB |
| Storage size | 0.005 GB | 1 GB |
| Uncached egress | 0.012 GB | 5 GB |
| Cached egress | 0.069 GB | 5 GB |
| Monthly active users | 3 | 50,000 |
| Monthly active third-party users | 0 | 50,000 |
| Realtime messages | 0 | 2,000,000 |
| Realtime concurrent peak connections | 0 | 200 |
| Edge Function invocation quota row | 0 | 500,000 |

The captured Usage page states that the organization has not exceeded its Free
Plan quota in the current billing cycle. The Edge Function value/quota is
visible in the capture; its row label is obscured by the open Realtime
connections tooltip, so the record preserves that limitation rather than
claiming the hidden label was directly read.

This completes the Phase 19 provider-capacity checkpoint. Future release/capacity
reviews should read current billing-cycle provider usage from Supabase Usage
rather than carrying these values forward as current telemetry.
