# Phase 17.8 — Production-first signup confirmation

Top Set uses a prefetch-safe two-step confirmation flow:

1. The browser creates the account with Supabase Auth and supplies an exact `/confirm-signup` redirect URL.
2. Supabase sends the token hash to the public `confirm-signup` Edge Function.
3. The bridge validates the return target and redirects to the Top Set `/confirm-signup` route without consuming the token.
4. Merely opening or previewing either URL does **not** verify the account.
5. The user explicitly chooses **Confirm email** in Top Set.
6. Only then does the browser call `supabase.auth.verifyOtp(...)`.
7. When Supabase returns a session, Top Set immediately enters the authenticated gate and sends a new member to onboarding.

This prevents email-security scanners and link previews from consuming Supabase's one-time confirmation token before the user acts.

## Browser origin contract

`src/lib/appOrigin.ts` is the client-side source of truth.

- Production: `https://topset2026.netlify.app`
- Netlify branch/deploy-preview origins: allowed over HTTPS for production builds.
- Localhost / `127.0.0.1`: allowed only when Vite reports a development build.
- Unknown origins: rejected. There is no silent localhost fallback.
- A production build running on localhost is intentionally blocked from creating a Supabase client.

Signup also writes `registration_origin` and `registration_build` into user metadata for diagnostics. These fields are user-editable metadata and must **never** be used for authorization.

## Canonical hosted confirmation template

The repository copy is `supabase/templates/confirmation.html`.

The hosted **Confirm signup** template should contain:

```html
<a href="https://ijkmevahyojfkxqykcjp.supabase.co/functions/v1/confirm-signup?token_hash={{ .TokenHash }}&amp;redirect_to={{ .RedirectTo }}">
  Confirm email address
</a>
```

`signUp()` and confirmation resend requests set `.RedirectTo` to the exact validated `/confirm-signup` URL.

The bridge remains safe if an older hosted template omits `redirect_to`: it falls back only to `https://topset2026.netlify.app/confirm-signup`. Localhost or preview return behavior requires the hosted template to pass `.RedirectTo`.

Do **not** use `{{ .ConfirmationURL }}` as the first-click email destination for signup confirmation. That URL verifies immediately and can be consumed by automated email scanners.

## Confirmation bridge

Canonical source: `supabase/functions/confirm-signup/index.ts`.

The function is deliberately public (`verify_jwt = false`) because a user following a confirmation email does not have a session yet. Its behavior is intentionally narrow:

- `HEAD` returns without consuming or forwarding a token.
- `GET` validates only token shape and redirects.
- It never calls `verifyOtp`, the Auth Admin API, or a database function.
- Production is the default target.
- `redirect_to` must point exactly to `/confirm-signup`.
- HTTPS Top Set Netlify preview targets are allowed.
- Local development targets are limited to `http://localhost:5173/confirm-signup` and `http://127.0.0.1:5173/confirm-signup`.
- Any other target falls back to production, preventing an open redirect.

The deployed Edge Function and repository source must stay aligned.

## Supabase URL configuration

For the hosted project, **Authentication → URL Configuration** should use:

- Site URL: `https://topset2026.netlify.app`
- Production confirmation redirect: `https://topset2026.netlify.app/confirm-signup`
- Production password-reset redirect: `https://topset2026.netlify.app/reset-password`
- Local development confirmation/reset URLs only if local Auth testing is required.
- A Top Set Netlify preview wildcard only if preview Auth testing is required.

The repository `supabase/config.toml` is production-first and mirrors this intent. The hosted Dashboard configuration is separate and must be kept synchronized when the platform does not expose an Auth-config write API through the connected tooling.

## Session handoff invariant

`AuthProvider` subscribes to auth-state changes and also performs an initial `getSession()` fallback. The initial snapshot must never overwrite a newer `SIGNED_IN`, `PASSWORD_RECOVERY`, or other auth-state event.

After `verifyOtp` returns a session, `/confirm-signup` immediately returns to `/`; the normal profile gate then sends a new member to onboarding.

## Production verification

After the current `master` build is deployed to Netlify, use a fresh account:

1. Open `https://topset2026.netlify.app` and create the account there.
2. Confirm the Supabase signup log `referer` is the Netlify production origin.
3. Confirm user metadata reports `registration_origin=https://topset2026.netlify.app` and `registration_build=production`.
4. Open the newest confirmation email.
5. Confirm the first click lands on production `/confirm-signup` with a token hash.
6. Confirm the account remains unverified until **Confirm email** is pressed.
7. Press **Confirm email** once.
8. Confirm Supabase records the verification, creates a session, and Top Set enters onboarding.
9. Sign out and sign back in with the password.
10. Repeat using **Resend confirmation email**.
11. Confirm GET/HEAD link previews alone do not verify the account.

If a future production signup log ever reports a localhost referer again, compare it with `registration_origin` and `registration_build`. A production build cannot deliberately initialize the Supabase client from localhost under this contract.
