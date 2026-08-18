# Architecture

## Layers

```text
React UI
   |
Application/features
   |
Pure domain rules
   |
Supabase client / RPC
   |
PostgreSQL + RLS + authoritative ledgers
```

React displays state and collects input. It does not become the authority for XP, permissions, or benchmark integrity.

## Frontend

- React + TypeScript + Vite.
- Phone-first product UI.
- Desktop uses the same PWA with wider dashboard layouts.
- Watch-sized CSS contracts are retained for future companion controls, but the web app is not assumed to be a native watchOS app.

## Domain layer

`src/domain` is framework-independent. It owns deterministic rules that can be tested without React or Supabase.

PostgreSQL may duplicate some critical qualification rules as a defense/authority boundary. When rules change, both layers and the test oracle must be updated together.

## Supabase

Supabase provides:

- Auth
- PostgreSQL
- RLS
- migrations
- local Studio/Mailpit through the CLI stack

The browser receives only a publishable/anon key. Service-role/secret keys are never exposed through Vite environment variables.

## Security boundaries

Client writable:

- own profile fields
- own workout sessions
- in-progress exercise/set rows
- groups the user creates/manages
- group invite records for owners/admins

Server/derived read-only from browser:

- XP events
- performance observations
- performance benchmark state
- weekly goal history (foundation phase)

Group membership role/status changes use controlled security-definer functions rather than arbitrary table updates.

## Group scalability

The group model is many-to-many:

```text
profiles <-> group_members <-> groups
```

There is no four-member limit. A user can eventually belong to multiple groups even if the initial UX emphasizes one group.

## Privacy

Raw workout rows are private to the owner in the foundation phase. Future group feeds/leaderboards should expose curated summaries/functions instead of granting every member full access to another user's notes/sets.

## Authentication

Supabase Auth owns credentials. The app implements:

- signup
- sign-in
- sign-out
- session persistence
- email verification-compatible signup
- password-reset email
- `/reset-password` password update

The database creates a `profiles` row automatically from an `auth.users` insert.

## Offline direction

A later phase will use local persistence/IndexedDB and idempotent sync. Do not assume network availability during an active workout.
