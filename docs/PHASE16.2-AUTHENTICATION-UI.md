# Phase 16.2 — Top Set authentication + password recovery

## Status

**VISUAL/LEGAL CANDIDATE READY FOR LOCAL VALIDATION.**

The roadmap remains `16.2 Authentication + password recovery — NEXT` until the complete local gate passes.

## Locked product direction

The product name is now **Top Set** with the human tagline:

> See what you’ve got today.

The authentication surface uses the approved mobile-first direction:

- one darkened real gym photograph spanning the full auth viewport, including behind the form surface;
- one simple, symmetrical barbell mark;
- dark charcoal surfaces with one warm orange interaction accent family and no competing blue auth actions;
- a deliberately dark, non-blurred form surface that lets only a restrained amount of the gym image continue underneath;
- compact copy and one clear primary action;
- no fake XP, telemetry, stat cards, feature icon rows, oversized marketing slogans, mesh gradients, or decorative dashboard content.

The supplied gym image is the only photograph used on authentication. The supplied dumbbell, kettlebell, and plate-loaded barbell photographs are included in source assets for later approved page redesigns but are not rendered here. The plate-loaded barbell image is reserved as a candidate full-width banner. Confirm the appropriate commercial usage rights for supplied stock photography before public release.

## Scope

This candidate covers:

- sign in;
- create account;
- forgot password;
- email confirmation;
- reset-password loading, valid, expired/missing, and completed states;
- missing Supabase configuration help;
- public `/terms` and `/privacy` routes;
- Top Set PWA/browser naming and application icons;
- Top Set name/mark in the existing authenticated shell without redesigning the shell itself.

## Visual refinement pass

The final candidate deliberately hardens the approved layout against browser defaults:

- the gym photograph is fixed behind the entire signed-out surface instead of ending above the form;
- the auth panel and field controls use dark translucent charcoal without backdrop blur;
- input elements explicitly keep transparent/dark backgrounds, including Chromium/WebKit autofill states, so password managers cannot introduce white rectangles;
- auth `Button` overrides use higher selector specificity than the shared blue product button skin;
- reset-password completion and invalid-link actions use auth-owned warm-accent link styles rather than the shared blue primary class;
- focus treatment on the auth surface stays within the same warm accent family.

## Behavior preserved

- Supabase Auth service/controller contracts are unchanged.
- Existing sign-in and sign-up validation remains authoritative.
- Password recovery remains enumeration-safe; the generic success response is still produced by `useAuthActions`.
- Onboarding, groups, scoring, XP, database schema, RLS, RPCs, workout recovery, and PWA behavior are unchanged.
- The signed-out `Sign in` heading remains unchanged for the established application gate.
- Shared `Button` and `TextField` remain authoritative. `TextField` receives only an additive trailing-control slot so password visibility can be implemented without creating a second input system.

## Legal pages

The Terms of Service and Privacy Policy are product-specific drafts based on the current Top Set feature set, including workout data, optional groups, profile images, offline recovery, push preferences, moderation, Supabase-backed authentication/storage, and self-service account deletion.

They intentionally avoid invented contact details. Operator identity/contact information and legal review should be finalized before a public commercial launch.

## Local validation order

1. `npx vitest run src/features/auth src/features/legal src/components/ui/TextField.test.tsx src/app/App.test.tsx`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:integration`
5. `npm run build`
6. `npm run test:structure`
7. `npm run test:internal`
8. `npm run db:test:ci`
9. `npm run test:e2e`

Do not mark Phase 16.2 DONE or advance the roadmap until this gate is green.
