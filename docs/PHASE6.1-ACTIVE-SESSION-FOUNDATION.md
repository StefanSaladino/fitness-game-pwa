# Phase 6.1A — Active Lifting Session Foundation

This slice establishes the durable workout-session lifecycle before exercise selection and set capture are layered on top.

## Behavior

- `Start Lift` creates an in-app strength session or returns the user's existing active one.
- One authenticated user can have at most one active in-app lifting session.
- The active session is recovered from persisted state whenever the Workouts surface mounts.
- Pause stores accumulated active seconds and a persisted paused state.
- Resume begins a new active interval without losing prior active time.
- Finish and cancel compute final active duration on the server and close the session.
- The dashboard links directly into the Workouts surface.

## Authorization

Authenticated clients retain RLS-filtered read access to their workout sessions, but direct insert/update/delete privileges are revoked. Session lifecycle writes go through authenticated-only security-definer RPCs:

- `start_or_resume_lifting_workout()`
- `pause_lifting_workout(uuid)`
- `resume_lifting_workout(uuid)`
- `finish_lifting_workout(uuid)`
- `cancel_lifting_workout(uuid)`

Each mutation resolves `auth.uid()` server-side and only acts on that user's active in-app strength workout.

## Timer model

`active_duration_seconds` stores completed active intervals. `last_resumed_at` marks the beginning of the current running interval. When paused, `paused_at` is populated and `last_resumed_at` is null. The client derives its display timer from this persisted state instead of owning authoritative elapsed time in React.

## Scope boundary

Exercise selection, exercise ordering/removal, set entry, and scoring reconciliation are intentionally separate follow-on slices. This phase creates the session those features attach to.
