import type { ComponentPropsWithoutRef, CSSProperties, PropsWithChildren } from 'react';
import styles from './DestinationBanner.module.css';

interface DestinationBannerProps extends Omit<ComponentPropsWithoutRef<'header'>, 'children'> {
  imagePosition?: CSSProperties['objectPosition'];
  imageSrc: string;
}

export function DestinationBanner({
  children,
  className = '',
  imagePosition = 'center',
  imageSrc,
  ...headerProps
}: PropsWithChildren<DestinationBannerProps>) {
  return (
    <header
      {...headerProps}
      className={`${styles.banner}${className ? ` ${className}` : ''}`}
      data-app-media-banner
      data-app-surface="primary"
    >
      <img alt="" aria-hidden="true" className={styles.image} src={imageSrc} style={{ objectPosition: imagePosition }} />
      <span aria-hidden="true" className={styles.scrim} />
      <div className={styles.content}>{children}</div>
    </header>
  );
}
