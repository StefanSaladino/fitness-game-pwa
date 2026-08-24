import type { PropsWithChildren } from 'react';
import styles from './OnboardingLayout.module.css';

export function OnboardingLayout({ children }: PropsWithChildren) {
  return (
    <main className={styles.root}>
      <div className={styles.visual} aria-hidden="true" />
      <section className={styles.content}>
        {children}
      </section>
    </main>
  );
}
