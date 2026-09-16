# Phase 19.1 — Exercise Catalogue Audit

## Purpose
Normalize the expanded Top Set exercise catalogue before Muscle Volume Intelligence assigns direct/indirect muscle contributions.

## Locked rules
- Muscle group remains the only picker sorting/filtering taxonomy.
- No new equipment/category enum is introduced.
- Existing canonical exercise IDs are preserved.
- Brand/manufacturer variants do not become canonical exercises.
- Ambiguous biomechanical classifications are not silently changed in this pass.

## Read-only audit findings
The production catalogue was inspected after Phase 19.0. The first implementation batch intentionally contains only high-confidence corrections:

1. `Handstand Push-Up`: CHEST → SHOULDERS.
2. `Pike Push-Up`: CHEST → SHOULDERS.
3. `Band External Rotation`: CORE → SHOULDERS.
4. `Band Internal Rotation`: CORE → SHOULDERS.
5. `Cable External Rotation`: CORE → SHOULDERS.
6. `Cable Internal Rotation`: CORE → SHOULDERS.
7. Add search aliases for those movements without replacing their canonical names.

## Items deliberately held for review
These are plausible cleanup candidates, but Phase 19.1 should not change them without a deliberate taxonomy decision:
- Hip adduction movements: current taxonomy has no ADDUCTORS group.
- Back extension / reverse hyper / GHD hip extension: primary-muscle assignment depends on execution and product convention.
- Generic `Biceps Curl` vs `Barbell Biceps Curl` and `Triceps Extension` vs equipment-specific variants: de-duplication could affect existing history/search expectations.
- `Machine Chest Fly` vs `Pec Deck Fly`: similar, but not always identical machine mechanics.
- Assisted Pull-Up/Dip measurement type: assistance-stack semantics do not map cleanly to ordinary loaded `WEIGHT_REPS`.

## Validation expectations
Before any production migration:
- inspect the SQL diff;
- run the normal TypeScript/unit/integration/build/structure/internal gate;
- optionally apply the migration to a local Supabase database or development branch first;
- verify the six corrected movements still appear under the intended muscle group and remain searchable by aliases.

This package does not apply a Supabase migration and does not commit or push anything.
