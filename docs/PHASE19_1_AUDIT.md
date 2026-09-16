# Phase 19.1 — Exercise Catalogue Audit

Status: **DONE**

## Purpose
Normalize the expanded Top Set exercise catalogue before Muscle Volume Intelligence assigns direct/indirect muscle contributions.

## Locked rules
- Muscle group remains the only picker sorting/filtering taxonomy.
- No new equipment/category enum is introduced.
- Existing canonical exercise IDs are preserved.
- Brand/manufacturer variants do not become canonical exercises.
- Ambiguous biomechanical classifications are not silently changed in this pass.

## Production corrections
Phase 19.1 intentionally deploys only high-confidence catalogue corrections:

1. `Handstand Push-Up`: CHEST → SHOULDERS.
2. `Pike Push-Up`: CHEST → SHOULDERS.
3. `Band External Rotation`: CORE → SHOULDERS.
4. `Band Internal Rotation`: CORE → SHOULDERS.
5. `Cable External Rotation`: CORE → SHOULDERS.
6. `Cable Internal Rotation`: CORE → SHOULDERS.
7. Add search aliases for those movements without replacing their canonical names.

The production migration is `20260915050000_phase19_1_exercise_catalog_audit.sql` and is recorded in hosted Supabase migration history as `phase19_1_exercise_catalog_audit`.

## Production validation
Validation completed after deployment:

- all six target exercises exist in the production catalogue;
- all six now have `primary_muscle_group = 'SHOULDERS'`;
- the expected aliases are present:
  - Handstand Push-Up: `HSPU`, `Handstand Pushup`;
  - Pike Push-Up: `Pike Pushup`;
  - Band External Rotation: `External Rotation with Band`;
  - Band Internal Rotation: `Internal Rotation with Band`;
  - Cable External Rotation: `Cable External Shoulder Rotation`;
  - Cable Internal Rotation: `Cable Internal Shoulder Rotation`;
- the migration was transaction-dry-run before production application and returned all six intended corrections;
- migration history was re-read after deployment and includes version `20260915050000`;
- the local TypeScript/unit/integration/build/database/E2E gate was reported green before production deployment.

No public schema shape changed in Phase 19.1, so generated TypeScript database types did not require regeneration.

## Items deliberately held for review
These remain plausible cleanup candidates, but Phase 19.1 does not change them because doing so requires an explicit taxonomy/product decision rather than a high-confidence correction:

- Hip adduction movements: current taxonomy has no ADDUCTORS group.
- Back extension / reverse hyper / GHD hip extension: primary-muscle assignment depends on execution and product convention.
- Generic `Biceps Curl` vs `Barbell Biceps Curl` and `Triceps Extension` vs equipment-specific variants: de-duplication could affect existing history/search expectations.
- `Machine Chest Fly` vs `Pec Deck Fly`: similar, but not always identical machine mechanics.
- Assisted Pull-Up/Dip measurement type: assistance-stack semantics do not map cleanly to ordinary loaded `WEIGHT_REPS`.

These cases can be revisited only when a later phase needs the distinction and can define the intended compatibility behavior.

## Advisor review
Supabase Security and Performance advisors were reviewed after deployment.

The migration only updates reference catalogue rows and aliases; it creates no tables, functions, policies, indexes, or grants. Advisor output therefore introduced no Phase 19.1-specific RLS, function-security, or indexing remediation.

Existing project-wide advisor findings remain separate backlog/security-capacity work and are not attributed to this catalogue-normalization migration.

## Closure
Phase 19.1 is complete. The catalogue is sufficiently normalized for Phase 19.2 to lock the Muscle Volume Intelligence methodology without first expanding the picker taxonomy or guessing ambiguous exercise classifications.
