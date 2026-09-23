# Phase 19.10 - Muscle Volume V2

Status: 19.10A seeded in Supabase; application compatibility is implemented by this patch; activation is intentionally deferred until the compatible application is deployed.

## Contract

Top Set keeps broad, human training language for exercise browsing and workout structure:

- BACK remains an exercise/workout category.
- SHOULDERS remains an exercise/workout category.
- A user can still have a Back Day, Shoulder Day, Pull Day, Push Day, Upper Day, and similar conventional sessions.

The volume methodology is more granular:

BACK contains:
- LATS
- UPPER_BACK
- TRAPS
- SPINAL_ERECTORS

SHOULDERS contains:
- ANTERIOR_DELTS
- LATERAL_DELTS
- POSTERIOR_DELTS

BACK and SHOULDERS are not muscle-volume-v2 scoring targets.

## Historical compatibility

muscle-volume-v1 is not rewritten. Existing frozen reports that contain BACK and SHOULDERS continue to use their stored v1 methodology and remain readable by the client.

muscle-volume-v2 is additive and was seeded inactive first. It preserves the v1 set-quality model, 568 exercise rules, and 418 eligible exercises, but replaces the 98 broad BACK contribution rows and 94 broad SHOULDERS contribution rows with reviewed subdivisions.

The v2 contribution matrix currently contains 825 contribution rows.

## Benchmark calibration

The subgroup benchmark bands are evidence-informed Top Set calibration rather than universal physiological thresholds. The available resistance-training literature supports dose-response relationships for hypertrophy and fractional treatment of indirect work, but precise validated weekly-set thresholds are not equally strong for every back region or deltoid head. For that reason the new subgroup bands use conservative evidence-confidence labels.

Seven-day v2 calibration:

| Group | Target | Review above | Confidence |
| --- | ---: | ---: | --- |
| Lats | 8-14 | 18 | Moderate-low |
| Upper back | 8-14 | 18 | Moderate-low |
| Traps | 4-10 | 14 | Low-moderate |
| Spinal erectors | 4-8 | 12 | Low |
| Anterior delts | 4-8 | 12 | Low-moderate |
| Lateral delts | 6-12 | 16 | Moderate-low |
| Posterior delts | 6-12 | 16 | Low-moderate |

The 28-day bands are the methodology's four-week equivalents.

## Phase 20

Phase 20 program session names stay conventional. The generator now uses granular targets inside those sessions, for example an Upper or Pull day can intentionally distribute work between lats, upper back, traps, and posterior delts rather than treating BACK as one homogeneous volume target.

19.10B will activate v2 only after the compatible application code is deployed. That activation will also update the candidate-catalogue RPC and monthly report freeze verification to resolve their active methodology dynamically.
