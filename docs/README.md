# Top Set Documentation

This directory contains two kinds of documentation: **current reference documents** and **historical phase records**. Current reference documents are maintained as the source of truth; completed phase files preserve implementation decisions and should not be treated as current setup instructions when the two differ.

## Current sources of truth

| Topic | Document |
|---|---|
| Current/future milestones | [`ROADMAP.md`](ROADMAP.md) |
| Phase 18 → native detail | [`PHASE18-LIVE-WORKOUT-ROADMAP.md`](PHASE18-LIVE-WORKOUT-ROADMAP.md) |
| Application architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Scoring/domain rules | [`DOMAIN-RULES.md`](DOMAIN-RULES.md) |
| Database model and boundaries | [`DATABASE.md`](DATABASE.md) |
| Environment variables/secrets | [`ENVIRONMENT.md`](ENVIRONMENT.md) |
| Hosted Supabase workflow | [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) |
| Testing/release validation | [`CI-VALIDATION.md`](CI-VALIDATION.md) |
| UI/responsive architecture | [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md) |
| CSS ownership | [`CSS-ARCHITECTURE.md`](CSS-ARCHITECTURE.md) |
| UI design/implementation gate | [`UI-DEVELOPMENT-GATE.md`](UI-DEVELOPMENT-GATE.md) |
| Product visual guardrails | [`UI-ANTI-AI-LAYOUT-RULES.md`](UI-ANTI-AI-LAYOUT-RULES.md) |

Repository-wide contribution rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

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
