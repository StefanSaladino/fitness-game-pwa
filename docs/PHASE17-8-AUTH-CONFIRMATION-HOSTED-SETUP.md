# Phase 17.8 — Prefetch-safe signup confirmation

The application code uses a two-step confirmation flow:

1. The confirmation email reaches `/confirm-signup` with the token hash.
2. Merely opening that page does **not** verify the account.
3. The user explicitly chooses **Confirm email**.
4. Only then does the browser call `supabase.auth.verifyOtp(...)`.

This prevents email-security scanners and link previews from consuming Supabase's one-time confirmation token before the user acts.

## Preferred hosted Supabase template

The canonical **Confirm signup** email template is `supabase/templates/confirmation.html`.

In Supabase Dashboard:

**Authentication → Emails → Templates → Confirm signup**

Preferred link:

```html
<a href="{{ .RedirectTo }}confirm-signup?token_hash={{ .TokenHash }}&type=email">
  Confirm email address
</a>
```

Do **not** use `{{ .ConfirmationURL }}` as the first-click email destination for signup confirmation.

## Current production bridge

During Phase 17.8, production may temporarily use the public `confirm-signup` Edge Function as the email target:

```text
https://ijkmevahyojfkxqykcjp.supabase.co/functions/v1/confirm-signup?token_hash={{ .TokenHash }}
```

Supabase Edge Functions intentionally rewrite HTML responses to `text/plain`, so this function must **not** render the confirmation UI. Its only safe GET behavior is to validate the token shape and redirect to the Top Set `/confirm-signup` page without consuming the token. The user-facing page lives in the PWA.

Do not remove the bridge while the hosted email template still points to it. Once the hosted template uses the preferred direct app link above and production is verified, the bridge can be retired.

## URL configuration

In **Authentication → URL Configuration**:

- Site URL: the official Top Set production origin.
- Redirect URLs must include the official Top Set production origin.
- Keep `http://localhost:5173` only for local development.
- If Netlify deploy previews are intentionally used for auth testing, allow the appropriate Netlify preview wildcard.

The browser constructs auth redirects from `window.location.origin`, so a stale `VITE_APP_URL=http://localhost:5173` value cannot pull a production user back to localhost.

## Verification after deployment

Use a fresh email address:

1. Create an account.
2. Open the newest Top Set confirmation email.
3. Confirm the first click lands on the Top Set `/confirm-signup` screen rather than raw HTML.
4. Before pressing **Confirm email**, confirm the account is still unconfirmed.
5. Press **Confirm email** once.
6. Confirm the page shows **You’re confirmed**.
7. Continue to Top Set and confirm sign-in/onboarding works.
8. Try the same old confirmation URL again and confirm Top Set shows recovery-oriented messaging rather than a raw Supabase error.
9. From a second fresh signup, use **Resend confirmation email** and verify the newest email succeeds.
