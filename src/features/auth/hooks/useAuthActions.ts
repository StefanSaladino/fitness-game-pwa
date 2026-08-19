import { useCallback, useState } from 'react';
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type SignUpInput,
} from '../authService';
import { toUserFacingAuthError } from '../authMessages';

export interface AuthActionState {
  busy: boolean;
  error: string;
  message: string;
}

export function useAuthActions() {
  const [state, setState] = useState<AuthActionState>({ busy: false, error: '', message: '' });

  const clearFeedback = useCallback(() => {
    setState((current) => ({ ...current, error: '', message: '' }));
  }, []);

  const begin = useCallback(() => setState({ busy: true, error: '', message: '' }), []);
  const fail = useCallback((error: string) => setState({ busy: false, error, message: '' }), []);
  const succeed = useCallback((message = '') => setState({ busy: false, error: '', message }), []);

  const performSignIn = useCallback(async (email: string, password: string) => {
    begin();
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      succeed();
      return true;
    } catch (error) {
      fail(toUserFacingAuthError('sign-in', error));
      return false;
    }
  }, [begin, fail, succeed]);

  const performSignUp = useCallback(async (input: SignUpInput) => {
    begin();
    try {
      const { data, error } = await signUp(input);
      if (error) throw error;
      const requiresEmailConfirmation = !data.session;
      succeed(requiresEmailConfirmation ? 'Check your email to confirm your account.' : 'Account created.');
      return { ok: true, requiresEmailConfirmation } as const;
    } catch (error) {
      fail(toUserFacingAuthError('sign-up', error));
      return { ok: false, requiresEmailConfirmation: false } as const;
    }
  }, [begin, fail, succeed]);

  const performPasswordReset = useCallback(async (email: string) => {
    begin();
    try {
      const { error } = await requestPasswordReset(email);
      if (error) throw error;
      succeed('If an account exists for that email, password-reset instructions have been sent.');
      return true;
    } catch (error) {
      fail(toUserFacingAuthError('password-reset', error));
      return false;
    }
  }, [begin, fail, succeed]);

  const performPasswordUpdate = useCallback(async (password: string) => {
    begin();
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      succeed('Your password has been updated.');
      return true;
    } catch (error) {
      fail(toUserFacingAuthError('password-update', error));
      return false;
    }
  }, [begin, fail, succeed]);

  return {
    ...state,
    clearFeedback,
    signIn: performSignIn,
    signUp: performSignUp,
    requestPasswordReset: performPasswordReset,
    updatePassword: performPasswordUpdate,
  };
}
