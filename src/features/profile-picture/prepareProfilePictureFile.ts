import { assertValidProfilePictureFile, PROFILE_PICTURE_MAX_BYTES } from './validation';

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = ['.heic', '.heif'];
const MAX_OUTPUT_DIMENSION = 2048;
const JPEG_QUALITY = 0.88;

export function isHeicProfilePictureFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return HEIC_TYPES.has(file.type.toLowerCase()) || HEIC_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('This iPhone photo could not be opened for conversion.'));
    };
    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('This iPhone photo could not be converted to JPEG.'));
    }, 'image/jpeg', JPEG_QUALITY);
  });
}

function jpegName(originalName: string): string {
  const base = originalName.replace(/\.(heic|heif)$/i, '') || 'profile-picture';
  return `${base}.jpg`;
}

export async function prepareProfilePictureFile(file: File): Promise<File> {
  if (!isHeicProfilePictureFile(file)) {
    return assertValidProfilePictureFile(file);
  }

  if (file.size <= 0) throw new Error('Choose a non-empty image file.');
  if (file.size > PROFILE_PICTURE_MAX_BYTES) throw new Error('Profile pictures must be 10 MB or smaller.');

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('This image has invalid dimensions.');

  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This iPhone photo could not be converted to JPEG.');
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToJpeg(canvas);
  const converted = new File([blob], jpegName(file.name), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });

  return assertValidProfilePictureFile(converted);
}
