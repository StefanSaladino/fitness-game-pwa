import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { ProfilePictureRecord, StoredProfilePicture } from './model';
import { assertValidProfilePictureFile } from './validation';

export const PROFILE_PICTURE_BUCKET = 'profile-pictures';

type ProfilePictureRow = { profile_picture_path: string | null };

export interface ProfilePictureService {
  get(userId: string): Promise<ProfilePictureRecord>;
  upload(userId: string, file: File, previousPath?: string | null): Promise<StoredProfilePicture>;
  remove(userId: string, currentPath: string | null): Promise<void>;
  getPublicUrl(path: string | null): string | null;
}

function extensionFor(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function randomObjectName(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createProfilePictureService(client: SupabaseClient = getSupabaseClient()): ProfilePictureService {
  const publicUrl = (path: string | null) => {
    if (!path) return null;
    return client.storage.from(PROFILE_PICTURE_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  return {
    async get(userId) {
      const result = await client
        .from('profiles')
        .select('profile_picture_path')
        .eq('id', userId)
        .single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Profile not found.');
      const path = (result.data as ProfilePictureRow).profile_picture_path;
      return { path, url: publicUrl(path) };
    },

    async upload(userId, file, previousPath = null) {
      assertValidProfilePictureFile(file);
      const path = `${userId}/${randomObjectName()}.${extensionFor(file)}`;
      const storage = client.storage.from(PROFILE_PICTURE_BUCKET);
      const upload = await storage.upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const profileUpdate = await client
        .from('profiles')
        .update({ profile_picture_path: path })
        .eq('id', userId);

      if (profileUpdate.error) {
        await storage.remove([path]).catch(() => undefined);
        throw profileUpdate.error;
      }

      if (previousPath && previousPath !== path) {
        await storage.remove([previousPath]).catch(() => undefined);
      }

      return { path, url: publicUrl(path)! };
    },

    async remove(userId, currentPath) {
      const profileUpdate = await client
        .from('profiles')
        .update({ profile_picture_path: null })
        .eq('id', userId);
      if (profileUpdate.error) throw profileUpdate.error;

      if (currentPath) {
        await client.storage.from(PROFILE_PICTURE_BUCKET).remove([currentPath]).catch(() => undefined);
      }
    },

    getPublicUrl: publicUrl,
  };
}
