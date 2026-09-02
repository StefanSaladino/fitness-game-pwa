import { getAppUrl, getSupabaseClient } from '../../lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

function authRedirect(path = ''): string {
  return `${getAppUrl()}${path}`;
}

export async function signUp({ email, password, displayName }: SignUpInput) {
  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: authRedirect('/'),
    },
  });
}

export async function resendSignUpConfirmation(email: string) {
  return getSupabaseClient().auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: authRedirect('/'),
    },
  });
}

export async function confirmSignUp(tokenHash: string) {
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
