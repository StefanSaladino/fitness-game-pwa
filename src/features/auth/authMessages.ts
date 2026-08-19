type AuthAction = 'sign-in' | 'sign-up' | 'password-reset' | 'password-update';

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export function toUserFacingAuthError(action: AuthAction, error: unknown): string {
  const candidate = (error ?? {}) as ErrorLike;
  const message = candidate.message?.toLowerCase() ?? '';

  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (message.includes('user already registered')) return 'An account with that email already exists.';
  if (message.includes('password') && (message.includes('weak') || message.includes('least'))) {
    return 'Choose a stronger password and try again.';
  }
  if (candidate.status === 429 || message.includes('rate limit')) {
    return 'Too many attempts. Try again in a little while.';
  }

  switch (action) {
    case 'sign-in':
      return 'We could not sign you in. Check your details and try again.';
    case 'sign-up':
      return 'We could not create the account. Review your details and try again.';
    case 'password-reset':
      return 'We could not send the reset email. Try again shortly.';
    case 'password-update':
      return 'We could not update the password. Request a new recovery link and try again.';
  }
}
