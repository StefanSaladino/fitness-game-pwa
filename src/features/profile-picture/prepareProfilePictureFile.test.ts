import { describe, expect, it } from 'vitest';
import { isHeicProfilePictureFile, prepareProfilePictureFile } from './prepareProfilePictureFile';

function file(name: string, type: string, contents = 'image') {
  return new File([contents], name, { type });
}

describe('profile picture preparation', () => {
  it('detects HEIC and HEIF by MIME type or extension', () => {
    expect(isHeicProfilePictureFile(file('photo.bin', 'image/heic'))).toBe(true);
    expect(isHeicProfilePictureFile(file('photo.bin', 'image/heif'))).toBe(true);
    expect(isHeicProfilePictureFile(file('PHOTO.HEIC', ''))).toBe(true);
    expect(isHeicProfilePictureFile(file('PHOTO.HEIF', 'application/octet-stream'))).toBe(true);
    expect(isHeicProfilePictureFile(file('photo.jpg', 'image/jpeg'))).toBe(false);
  });

  it('leaves already web-safe images unchanged', async () => {
    const original = file('profile.jpg', 'image/jpeg');
    await expect(prepareProfilePictureFile(original)).resolves.toBe(original);
  });
});
