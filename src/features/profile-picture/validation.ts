export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PICTURE_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateProfilePictureFile(file: File): string | null {
  if (!PROFILE_PICTURE_ALLOWED_TYPES.has(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0) return 'Choose a non-empty image file.';
  if (file.size > PROFILE_PICTURE_MAX_BYTES) return 'Profile pictures must be 2 MB or smaller.';
  return null;
}

export function assertValidProfilePictureFile(file: File): File {
  const error = validateProfilePictureFile(file);
  if (error) throw new Error(error);
  return file;
}
