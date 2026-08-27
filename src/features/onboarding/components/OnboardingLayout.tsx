import type { PropsWithChildren } from 'react';
import styles from './OnboardingLayout.module.css';

export function OnboardingLayout({ children }: PropsWithChildren) {
  return (
    <main className={styles.root} data-onboarding-layout>
      <div className={styles.visual} aria-hidden="true" />
      <section className={styles.content} aria-label="Profile setup">
        {children}
      </section>
    </main>
  );
}
