import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createProfilePictureService, PROFILE_PICTURE_BUCKET } from './profilePictureService';

function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update']) builder[method] = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };
}

function fakeClient(profileQueries: ReturnType<typeof query>[]) {
  let index = 0;
  const upload = vi.fn(async () => ({ data: { path: 'uploaded' }, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }));
  const storageFrom = vi.fn(() => ({ upload, remove, getPublicUrl }));
  const from = vi.fn((table: string) => {
    if (table !== 'profiles') throw new Error(`Unexpected table ${table}`);
    const value = profileQueries[index++];
    if (!value) throw new Error(`Unexpected profiles query #${index - 1}`);
    return value;
  });
  return {
    client: { from, storage: { from: storageFrom } } as unknown as SupabaseClient,
    upload,
    remove,
    getPublicUrl,
    storageFrom,
  };
}

describe('profile picture service', () => {
  it('loads a stored path and derives the public URL', async () => {
    const profile = query({ data: { profile_picture_path: 'user-1/photo.webp' }, error: null });
    const fake = fakeClient([profile]);
    const service = createProfilePictureService(fake.client);

    await expect(service.get('user-1')).resolves.toEqual({
      path: 'user-1/photo.webp',
      url: 'https://cdn.test/user-1/photo.webp',
    });
    expect(fake.storageFrom).toHaveBeenCalledWith(PROFILE_PICTURE_BUCKET);
  });

  it('uploads to the users folder, updates the profile reference, then removes the previous object', async () => {
    const update = query({ data: null, error: null });
    const fake = fakeClient([update]);
    const service = createProfilePictureService(fake.client);
    const file = new File(['image'], 'new.png', { type: 'image/png' });

    const stored = await service.upload('user-1', file, 'user-1/old.png');

    expect(stored.path).toMatch(/^user-1\/.+\.png$/);
    expect(fake.upload).toHaveBeenCalledWith(stored.path, file, expect.objectContaining({ upsert: false, contentType: 'image/png' }));
    expect(update.update).toHaveBeenCalledWith({ profile_picture_path: stored.path });
    expect(fake.remove).toHaveBeenCalledWith(['user-1/old.png']);
  });

  it('clears the profile reference and removes the stored object', async () => {
    const update = query({ data: null, error: null });
    const fake = fakeClient([update]);
    const service = createProfilePictureService(fake.client);

    await service.remove('user-1', 'user-1/photo.webp');

    expect(update.update).toHaveBeenCalledWith({ profile_picture_path: null });
    expect(fake.remove).toHaveBeenCalledWith(['user-1/photo.webp']);
  });
});
