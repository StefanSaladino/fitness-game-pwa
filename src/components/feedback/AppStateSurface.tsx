import type { ReactNode } from 'react';
import styles from './AppStateSurface.module.css';

interface AppStateSurfaceProps {
  action?: ReactNode;
  compact?: boolean;
  description?: ReactNode;
  eyebrow?: string;
  headingLevel?: 1 | 2 | 3;
  role?: 'alert' | 'status';
  title: string;
  tone?: 'neutral' | 'error' | 'success';
}

export function AppStateSurface({
  action,
  compact = false,
  description,
  eyebrow,
  headingLevel = 2,
  role,
  title,
  tone = 'neutral',
}: AppStateSurfaceProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section
      className={styles.surface}
      data-app-state
      data-compact={compact}
      data-tone={tone}
      role={role}
    >
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Heading>{title}</Heading>
      {description ? <div className={styles.description}>{description}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
