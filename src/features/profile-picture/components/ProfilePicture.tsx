import { useEffect, useMemo, useState } from 'react';
import styles from './ProfilePicture.module.css';

export type ProfilePictureSize = 'sm' | 'md' | 'lg' | 'xl';

interface ProfilePictureProps {
  displayName: string;
  src?: string | null;
  size?: ProfilePictureSize;
  className?: string;
}

function initialsFor(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function ProfilePicture({ displayName, src = null, size = 'md', className = '' }: ProfilePictureProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = useMemo(() => initialsFor(displayName), [displayName]);
  const classes = `${styles.picture} ${styles[size]} ${className}`.trim();

  if (!src || failed) {
    return <span className={`${classes} ${styles.fallback}`} aria-label={`${displayName} profile picture placeholder`}>{initials}</span>;
  }

  return <img className={classes} src={src} alt={`${displayName} profile picture`} onError={() => setFailed(true)} />;
}
