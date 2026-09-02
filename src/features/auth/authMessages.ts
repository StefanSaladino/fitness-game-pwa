type AuthAction =
  | 'sign-in'
  | 'sign-up'
  | 'resend-confirmation'
  | 'confirm-signup'
  | 'password-reset'
  | 'password-update';

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
  if (
    action === 'confirm-signup'
    && (
      message.includes('expired')
      || message.includes('invalid')
      || message.includes('one-time token')
      || message.includes('otp')
    )
  ) {
    return 'This confirmation link is no longer valid. Your email may already be confirmed. Try signing in, or request a new confirmation email.';
  }
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
    case 'resend-confirmation':
      return 'We could not send another confirmation email. Try again shortly.';
    case 'confirm-signup':
      return 'We could not confirm this email. Try signing in, or request a new confirmation email.';
    case 'password-reset':
      return 'We could not send the reset email. Try again shortly.';
    case 'password-update':
      return 'We could not update the password. Request a new recovery link and try again.';
  }
}
