import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProfilePictureService } from '../profilePictureService';
import { useProfilePicture } from './useProfilePicture';

function service(overrides: Partial<ProfilePictureService> = {}): ProfilePictureService {
  return {
    get: vi.fn(async () => ({ path: null, url: null })),
    upload: vi.fn(async () => ({ path: 'user-1/photo.webp', url: 'https://cdn.test/user-1/photo.webp' })),
    remove: vi.fn(async () => undefined),
    getPublicUrl: vi.fn((path) => path ? `https://cdn.test/${path}` : null),
    ...overrides,
  };
}

describe('useProfilePicture', () => {
  it('loads then stores a successful upload in local state', async () => {
    const api = service();
    const { result } = renderHook(() => useProfilePicture('user-1', api));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const file = new File(['image'], 'photo.webp', { type: 'image/webp' });
    await act(async () => {
      await expect(result.current.upload(file)).resolves.toBe(true);
    });

    expect(result.current.picture.path).toBe('user-1/photo.webp');
    expect(api.upload).toHaveBeenCalledWith('user-1', file, null);
  });

  it('clears local state after removal', async () => {
    const api = service({ get: vi.fn(async () => ({ path: 'user-1/photo.webp', url: 'https://cdn.test/user-1/photo.webp' })) });
    const { result } = renderHook(() => useProfilePicture('user-1', api));
    await waitFor(() => expect(result.current.picture.path).toBe('user-1/photo.webp'));

    await act(async () => {
      await expect(result.current.remove()).resolves.toBe(true);
    });

    expect(result.current.picture).toEqual({ path: null, url: null });
    expect(api.remove).toHaveBeenCalledWith('user-1', 'user-1/photo.webp');
  });
});
