export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  displayName: string;
  confirmPassword: string;
}

export interface ValidationResult<T> {
  value: T;
  errors: Partial<Record<keyof T, string>>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignIn(input: SignInCredentials): ValidationResult<SignInCredentials> {
  const value = {
    email: normalizeEmail(input.email),
    password: input.password,
  };
  const errors: ValidationResult<SignInCredentials>['errors'] = {};

  if (!EMAIL_PATTERN.test(value.email)) errors.email = 'Enter a valid email address.';
  if (!value.password) errors.password = 'Enter your password.';

  return { value, errors };
}

export function validateSignUp(input: SignUpCredentials): ValidationResult<SignUpCredentials> {
  const value = {
    email: normalizeEmail(input.email),
    password: input.password,
    confirmPassword: input.confirmPassword,
    displayName: input.displayName.trim(),
  };
  const errors: ValidationResult<SignUpCredentials>['errors'] = {};

  if (value.displayName.length < 1 || value.displayName.length > 80) {
    errors.displayName = 'Display name must be between 1 and 80 characters.';
  }
  if (!EMAIL_PATTERN.test(value.email)) errors.email = 'Enter a valid email address.';
  if (value.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (value.confirmPassword !== value.password) errors.confirmPassword = 'Passwords do not match.';

  return { value, errors };
}

export function hasValidationErrors<T>(errors: Partial<Record<keyof T, string>>): boolean {
  return Object.keys(errors).length > 0;
}
