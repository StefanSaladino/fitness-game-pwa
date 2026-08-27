import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';
import { TopSetMark } from '../../../components/brand/TopSetMark';
import { navigateToPath } from '../../../lib/appNavigation';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  eyebrow?: string;
  title: string;
  description: string;
  footer?: ReactNode;
}

function LegalLinks() {
  function navigate(event: MouseEvent<HTMLAnchorElement>, pathname: string) {
    event.preventDefault();
    navigateToPath(pathname);
  }

  return (
    <p className={styles.legalCopy}>
      By continuing, you agree to our{' '}
      <a href="/terms" onClick={(event) => navigate(event, '/terms')}>Terms of Service</a>{' '}
      and{' '}
      <a href="/privacy" onClick={(event) => navigate(event, '/privacy')}>Privacy Policy</a>.
    </p>
  );
}

export function AuthLayout({ eyebrow, title, description, footer, children }: PropsWithChildren<AuthLayoutProps>) {
  return (
    <main className={styles.root} data-auth-composition>
      <div className={styles.photo} aria-hidden="true" />
      <div className={styles.frame}>
        <header className={styles.brand} aria-label="Top Set">
          <TopSetMark className={styles.mark} size={44} />
          <p className={styles.name}>TOP SET</p>
          <p className={styles.tagline}>See what you’ve got today.</p>
        </header>

        <section className={styles.panel} data-app-surface="primary">
          <header className={styles.header}>
            {eyebrow ? <p className={styles.context}>{eyebrow}</p> : null}
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </header>
          {children}
          {footer ? <div className={styles.footer}>{footer}</div> : null}
          <LegalLinks />
        </section>
      </div>
    </main>
  );
}
