import { OnboardingValidationError } from '../onboarding/validation';

type ErrorLike = { message?: string; code?: string; status?: number };

export function toUserFacingSettingsError(error: unknown): string {
  if (error instanceof OnboardingValidationError) {
    return error.issues[0]?.message ?? 'Check your profile settings and try again.';
  }
  const candidate = (error ?? {}) as ErrorLike;
  const message = candidate.message?.toLowerCase() ?? '';
  if (candidate.code === '23505' || message.includes('username already taken')) {
    return 'That username is already taken. Choose another one.';
  }
  if (message.includes('invalid timezone')) return 'Choose a valid timezone and try again.';
  if (message.includes('active account required')) return 'This account cannot change profile settings right now.';
  return 'We could not save your settings. Try again.';
}

export function toUserFacingDeletionError(error: unknown): string {
  const message = ((error ?? {}) as ErrorLike).message?.toLowerCase() ?? '';
  if (message.includes('group ownership must be transferred')) {
    return 'Transfer ownership of every group you own before deleting your account. Open Groups to choose a new owner.';
  }
  if (message.includes('platform administrator must be revoked')) {
    return 'Your platform-administrator access must be revoked before this account can be deleted.';
  }
  if (message.includes('account must be active')) {
    return 'This account is not eligible to start deletion right now.';
  }
  return 'We could not update the account-deletion request. Try again.';
}
