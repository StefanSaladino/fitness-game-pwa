export function toUserFacingProfilePictureError(error: unknown): string {
  if (error instanceof Error && /JPEG|PNG|WebP|2 MB|non-empty/i.test(error.message)) return error.message;
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/payload too large|file size|maximum/i.test(message)) return 'Profile pictures must be 2 MB or smaller.';
  if (/mime|content.?type|unsupported/i.test(message)) return 'Choose a JPEG, PNG, or WebP image.';
  if (/row-level security|permission|not authorized|forbidden/i.test(message)) return 'You do not have permission to change this profile picture.';
  return 'We couldn’t update your profile picture. Try again.';
}
