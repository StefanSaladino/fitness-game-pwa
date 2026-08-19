# Phase 5.3A — Authentication and Onboarding UI

## Scope

This phase implements the approved authentication and profile-onboarding experience without introducing group-management or workout-capture business logic.

## User flow

```text
Open app
  -> restore Supabase session
  -> signed out: Sign in / Create account / Forgot password
  -> email confirmation when required
  -> signed in: load public.profiles row for the authenticated user
  -> onboarding incomplete: profile setup
  -> onboarding RPC succeeds atomically
  -> reload persisted profile
  -> onboarding complete: authenticated shell
```

Password recovery uses the existing `/reset-password` route and Supabase recovery session.

## Separation of concerns

### Presentation components

`src/features/auth/components/` and `src/features/onboarding/components/` render fields, buttons, validation feedback, and approved responsive layout. They do not import Supabase clients or SQL/RPC details.

### Hooks/controllers

`useAuthActions` owns async Auth action state and converts provider errors into product-safe messages. `useOnboarding` loads persisted profile state, calls the onboarding service, and reloads the profile after successful completion.

### Services

`authService.ts` and `onboardingService.ts` are the Supabase boundary. The onboarding service invokes the atomic `complete_onboarding` RPC introduced in Phase 5.1.

### Pure validation

Auth and onboarding validation remains framework-independent and is unit tested separately.

## Profile onboarding fields

- username: normalized lowercase, 3–32 letters/numbers/underscores
- display name: 1–80 characters
- timezone: valid IANA timezone
- weekly lifting target: integer 1–7 lifting days

The generated internal username assigned by the Auth trigger is not shown to a new user as their chosen username.

## Responsive behavior

### Phone

- stacked brand/context panel and form card
- single-column fields
- seven equal weekly-target touch controls
- primary action spans available width

### Desktop

- two-panel Auth layout with product context beside the form
- two-column onboarding composition
- onboarding form may use two columns where space allows

### Smartwatch

No smartwatch UI is implemented in this PWA phase. The approved watch concept remains a future native companion.

## Security and privacy behavior

- publishable Supabase key only in the browser
- raw service-role/secret keys remain forbidden
- generic password-reset response does not disclose whether an email is registered
- raw Supabase/database errors are not rendered directly for ordinary Auth actions
- RLS and RPCs remain the authorization boundary

## Exit criteria

- signed-out Auth screen is reachable after session restoration
- create-account flow handles confirmation-required state
- forgot/reset-password UI is wired through the Auth controller
- signed-in users load their actual profile
- incomplete profiles see onboarding after refresh/login
- onboarding completion reloads authoritative persisted state
- completed profiles proceed to the authenticated shell
- TypeScript, Vitest, build, structural validation, and Playwright shell tests pass
