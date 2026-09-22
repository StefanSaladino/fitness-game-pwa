# Top Set Documentation

This directory contains two kinds of documentation: **current reference documents** and **historical phase records**. Current reference documents are maintained as the source of truth; completed phase files preserve implementation decisions and should not be treated as current setup instructions when the two differ.

## Current sources of truth

| Topic | Document |
|---|---|
| Current/future milestones and Phase 20 next milestone | [`ROADMAP.md`](ROADMAP.md) |
| Application architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Scoring/domain rules | [`DOMAIN-RULES.md`](DOMAIN-RULES.md) |
| Database model and boundaries | [`DATABASE.md`](DATABASE.md) |
| Environment variables/secrets | [`ENVIRONMENT.md`](ENVIRONMENT.md) |
| Hosted Supabase workflow | [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) |
| Testing/release validation | [`CI-VALIDATION.md`](CI-VALIDATION.md) |
| UI/responsive architecture | [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md) |
| CSS ownership | [`CSS-ARCHITECTURE.md`](CSS-ARCHITECTURE.md) |
| UI design/implementation gate | [`UI-DEVELOPMENT-GATE.md`](UI-DEVELOPMENT-GATE.md) |
| Phase 19 capacity/retention validation | [`PHASE19-CAPACITY-VALIDATION.md`](PHASE19-CAPACITY-VALIDATION.md) |
| Historical Phase 18 live-workout/native sequencing detail | [`PHASE18-LIVE-WORKOUT-ROADMAP.md`](PHASE18-LIVE-WORKOUT-ROADMAP.md) |

Repository-wide contribution rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Active documentation checkpoint

Phase 19.9 and Phase 19 are **complete** in Top Set v1.1.0. The canonical docs describe completed-period Reports UI, frozen monthly source snapshots, hosted end-to-end proof, reconciled database types, verified private latest-PDF retention, provider-capacity confirmation, security hardening, and the completed release-validation gate. Phase 20 Personalized Training Programs is the next planned milestone.

## Historical phase records

Files named `PHASE*.md` document a particular implementation slice, decision, or release checkpoint. They are useful for understanding why a migration or feature exists.

Once a phase is complete:

- its phase file is historical unless explicitly identified as an active roadmap;
- current architecture/setup/testing behavior must be described in the canonical documents above;
- contradictory old instructions do not override current reference docs, current code, or immutable migration history.

## Documentation maintenance rules

- Keep one source of truth per operational topic.
- Link instead of copying command lists or policy text into multiple documents.
- Update current docs in the same change that alters their contract.
- Use Git history and `CHANGELOG.md` for delivery history.
- Do not commit temporary handoff files, patch manifests, hotfix READMEs, or scratch notes.
- Remove superseded standalone notes once their lasting decision is represented in current docs or Git history.
- Prefer primary vendor documentation over copied third-party instructions for external APIs/platform behavior.
