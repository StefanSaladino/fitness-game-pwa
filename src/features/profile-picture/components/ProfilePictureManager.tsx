import { useRef, useState } from 'react';
import { Button } from '../../../components/ui';
import type { ProfilePictureService } from '../profilePictureService';
import { PROFILE_PICTURE_ACCEPT, validateProfilePictureFile } from '../validation';
import { useProfilePicture } from '../hooks/useProfilePicture';
import { ProfilePicture } from './ProfilePicture';
import styles from './ProfilePictureManager.module.css';

interface ProfilePictureManagerProps {
  userId: string;
  displayName: string;
  service?: ProfilePictureService;
}

export function ProfilePictureManager({ userId, displayName, service }: ProfilePictureManagerProps) {
  const picture = useProfilePicture(userId, service);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');

  const choose = (file: File | null) => {
    setSelected(null);
    setLocalError('');
    if (!file) return;
    const validation = validateProfilePictureFile(file);
    if (validation) {
      setLocalError(validation);
      return;
    }
    setSelected(file);
  };

  const save = async () => {
    if (!selected) return;
    const success = await picture.upload(selected);
    if (success) {
      setSelected(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (picture.status === 'loading') return <p className={styles.status}>Loading profile picture…</p>;
  if (picture.status === 'error') {
    return (
      <div className={styles.statusBlock}>
        <p>{picture.error}</p>
        <Button variant="secondary" onClick={() => void picture.retry()}>Try again</Button>
      </div>
    );
  }

  const error = localError || picture.error;
  return (
    <section className={styles.manager} aria-label="Profile picture settings">
      <div className={styles.previewRow}>
        <ProfilePicture displayName={displayName} size="xl" src={picture.picture.url} />
        <div>
          <strong>{picture.picture.path ? 'Profile picture' : 'Add a profile picture'}</strong>
          <p>JPEG, PNG, or WebP. Maximum 10 MB. Images display as a centered square crop.</p>
        </div>
      </div>

      <label className={styles.fileLabel}>
        <span>Choose image</span>
        <input
          ref={fileRef}
          type="file"
          accept={PROFILE_PICTURE_ACCEPT}
          disabled={picture.busy}
          onChange={(event) => choose(event.currentTarget.files?.[0] ?? null)}
        />
      </label>

      {selected ? <p className={styles.selected}>Selected: {selected.name}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.actions}>
        <Button disabled={!selected || picture.busy} onClick={() => void save()}>
          {picture.busy ? 'Saving…' : picture.picture.path ? 'Replace picture' : 'Save picture'}
        </Button>
        {picture.picture.path ? (
          <Button variant="secondary" disabled={picture.busy} onClick={() => void picture.remove()}>
            Remove
          </Button>
        ) : null}
      </div>
    </section>
  );
}
