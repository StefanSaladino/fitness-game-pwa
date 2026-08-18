import { getAppUrl, getSupabaseClient } from '../../lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export async function signUp({ email, password, displayName }: SignUpInput) {
  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: `${getAppUrl()}/`,
    },
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
    redirectTo: `${getAppUrl()}/reset-password`,
  });
}

export async function updatePassword(password: string) {
  return getSupabaseClient().auth.updateUser({ password });
}
