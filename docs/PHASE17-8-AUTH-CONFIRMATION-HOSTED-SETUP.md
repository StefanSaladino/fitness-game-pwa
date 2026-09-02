# Phase 17.8 — Prefetch-safe signup confirmation

Top Set uses a two-step confirmation flow:

1. Supabase sends the confirmation token hash to the public `confirm-signup` Edge Function.
2. The bridge redirects to the Top Set `/confirm-signup` route without consuming the token.
3. Merely opening or previewing either URL does **not** verify the account.
4. The user explicitly chooses **Confirm email** in Top Set.
5. Only then does the browser call `supabase.auth.verifyOtp(...)`.
6. When Supabase returns a session, Top Set immediately enters the normal authenticated gate and sends a new member to onboarding.

This prevents email-security scanners and link previews from consuming Supabase's one-time confirmation token before the user acts.

## Canonical hosted template

The repository copy of the **Confirm signup** email template is `supabase/templates/confirmation.html`.

The hosted Supabase template must contain this link:

```html
<a href="https://ijkmevahyojfkxqykcjp.supabase.co/functions/v1/confirm-signup?token_hash={{ .TokenHash }}&amp;redirect_to={{ .RedirectTo }}">
  Confirm email address
</a>
```

The `redirect_to` parameter is required. `signUp()` and confirmation resend requests set `.RedirectTo` from the current browser origin, so a localhost signup returns to localhost, a Netlify preview returns to that preview, and a production signup returns to production.

Do **not** use `{{ .ConfirmationURL }}` as the first-click email destination for signup confirmation. That URL verifies immediately and can be consumed by automated email scanners.

## Confirmation bridge

The canonical bridge source is committed at:

`supabase/functions/confirm-signup/index.ts`

It is deliberately public (`verify_jwt = false`) because a user following a confirmation email does not have a session yet. Its safe behavior is intentionally narrow:

- `HEAD` returns without consuming or forwarding the token.
- `GET` validates only the token shape and redirects.
- It never calls `verifyOtp`, the Auth Admin API, or a database function.
- It accepts return origins only for production, localhost development, and Top Set Netlify branch/deploy-preview origins.
- An absent or invalid `redirect_to` falls back to the production Top Set origin.

The deployed function and the repository copy must remain byte-for-byte behaviorally equivalent. Do not make dashboard-only Edge Function changes without committing the same source here.

## URL configuration

In **Authentication → URL Configuration**:

- Site URL: the official Top Set production origin.
- Redirect URLs must include the official Top Set production origin.
- Keep `http://localhost:5173` for supported local registration/recovery testing.
- If Netlify deploy previews are intentionally used for auth testing, allow the appropriate Top Set Netlify preview wildcard.

The browser constructs auth redirects from `window.location.origin`, so a stale `VITE_APP_URL=http://localhost:5173` value cannot pull a production user back to localhost.

## Session handoff invariant

`AuthProvider` subscribes to auth-state changes and also performs an initial `getSession()` fallback. The initial snapshot must never overwrite a newer `SIGNED_IN`, `PASSWORD_RECOVERY`, or other auth-state event. This is regression-tested because callback processing and initial session restoration can complete in either order.

## Verification after deployment

Use a fresh email address and test both localhost and production:

1. Create an account.
2. Open the newest Top Set confirmation email.
3. Confirm the first click lands on `/confirm-signup` on the same origin where registration began.
4. Before pressing **Confirm email**, confirm the account remains unconfirmed.
5. Press **Confirm email** once.
6. Confirm the account is verified and a session is created.
7. Confirm Top Set enters onboarding without returning to the sign-in form.
8. Re-open the old confirmation URL and confirm Top Set shows recovery-oriented messaging rather than a raw Supabase error.
9. Repeat from **Resend confirmation email** and verify the newest link succeeds.
10. Confirm email-scanner or preview GET/HEAD requests do not verify the account by themselves.
