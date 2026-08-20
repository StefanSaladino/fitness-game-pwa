# v0.5.1 — Phase 6.4A Local Active-Workout Recovery

Apply this patch after the green v0.5.0 Phase 6.3 checkpoint and the roadmap engineering-rules update.

## Scope

This slice protects an already-active workout from disappearing when the app refreshes/restarts or ordinary connectivity is lost.

- versioned per-user local active-workout snapshot
- active session timing identity
- ordered workout exercises
- persisted set state
- unsaved weight/reps/type/bodyweight-mode drafts
- kg/lb display preference
- immediate local recovery while remote reads are unavailable
- explicit synced / recovering / offline / local-only presentation states
- read-only retry on browser reconnect
- server-backed mutations disabled while state is not reconciled
- locally editable existing set drafts while offline

## Deliberate non-goals

- no general offline mutation queue
- no idempotency-key system
- no local creation/deletion/reorder replay
- no conflict/merge engine
- no scoring changes
- no Supabase migration

Those belong to later 6.4 slices.

## Validation

Run the full local gate:

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

There is no Supabase SQL to apply for this patch.
