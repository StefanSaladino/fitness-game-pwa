import { getAppUrl, getSupabaseClient } from '../../lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

function authRedirect(path: string): string {
  const origin = getAppUrl();
  return new URL(path, `${origin}/`).toString();
}

export async function signUp({ email, password, displayName }: SignUpInput) {
  const registrationOrigin = getAppUrl();

  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName.trim(),
        // Diagnostic only. Never use user metadata for authorization decisions.
        registration_origin: registrationOrigin,
        registration_build: import.meta.env.DEV ? 'development' : 'production',
      },
      emailRedirectTo: new URL('/confirm-signup', `${registrationOrigin}/`).toString(),
    },
  });
}

export async function resendSignUpConfirmation(email: string) {
  return getSupabaseClient().auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: authRedirect('/confirm-signup'),
    },
  });
}

export async function confirmSignUp(tokenHash: string) {
  // getSupabaseClient validates that a production build is running on an approved
  // Top Set origin before the one-time token can be exchanged.
  return getSupabaseClient().auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });
}

export async function signIn(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return getSupabaseClient().auth.signOut();
}

export async function requestPasswordReset(email: string) {
  return getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect('/reset-password'),
  });
}

export async function updatePassword(password: string) {
  return getSupabaseClient().auth.updateUser({ password });
}
