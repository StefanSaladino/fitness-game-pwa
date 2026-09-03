import { describe, expect, it } from 'vitest';
import { PROFILE_PICTURE_MAX_BYTES, validateProfilePictureFile } from './validation';

describe('profile picture validation', () => {
  it('accepts supported images at or below the size limit', () => {
    const file = new File(['image'], 'profile.webp', { type: 'image/webp' });
    expect(validateProfilePictureFile(file)).toBeNull();
  });

  it('rejects unsupported file types', () => {
    const file = new File(['image'], 'profile.gif', { type: 'image/gif' });
    expect(validateProfilePictureFile(file)).toMatch(/JPEG, PNG, or WebP/i);
  });

  it('rejects files larger than 10 MB', () => {
    const file = new File([new Uint8Array(PROFILE_PICTURE_MAX_BYTES + 1)], 'large.jpg', { type: 'image/jpeg' });
    expect(validateProfilePictureFile(file)).toMatch(/10 MB/i);
  });
});
