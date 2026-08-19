type ErrorLike = {
  message?: string;
  code?: string;
};

export function toUserFacingOnboardingError(error: unknown): string {
  const candidate = (error ?? {}) as ErrorLike;
  const message = candidate.message?.toLowerCase() ?? '';

  if (candidate.code === '23505' || message.includes('username already taken')) {
    return 'That username is already taken. Choose another one.';
  }
  if (message.includes('onboarding already completed')) {
    return 'Your profile setup is already complete. Refresh the app to continue.';
  }
  if (message.includes('invalid timezone')) {
    return 'Choose a valid timezone and try again.';
  }

  return 'We could not save your profile setup. Your changes were not partially applied; try again.';
}
