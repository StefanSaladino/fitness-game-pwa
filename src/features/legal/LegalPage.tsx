import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';
import { TopSetMark } from '../../components/brand/TopSetMark';
import { navigateToPath } from '../../lib/appNavigation';
import styles from './LegalPage.module.css';

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  function home(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    navigateToPath('/');
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" onClick={home}>
            <TopSetMark className={styles.mark} size={28} />
            <span>TOP SET</span>
          </a>
          <a className={styles.back} href="/" onClick={home}>Back to sign in</a>
        </div>
      </header>
      <article className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.updated}>Effective August 23, 2026</p>
        <p className={styles.intro}>{intro}</p>
        {children}
        <p className={styles.notice}>These policies are a practical product draft for Top Set and should be reviewed before a public commercial launch, especially if the operator, hosting providers, age requirements, or data practices change.</p>
      </article>
    </main>
  );
}
