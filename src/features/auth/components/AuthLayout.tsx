import type { PropsWithChildren, ReactNode } from 'react';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}

export function AuthLayout({ eyebrow, title, description, footer, children }: PropsWithChildren<AuthLayoutProps>) {
  return (
    <main className="auth-experience">
      <section className="auth-brand-panel" aria-label="Workout Game introduction">
        <div className="auth-brand-panel__mark" aria-hidden="true">WG</div>
        <div className="auth-brand-panel__copy">
          <p className="eyebrow">WORKOUT GAME</p>
          <h2>Lift. Progress. Level up together.</h2>
          <p>Lifting drives the score: complete real sessions, finish meaningful exercises, and improve your own lifts. Cardio stays a small bonus.</p>
        </div>
        <div className="auth-brand-panel__metrics" aria-hidden="true">
          <span><strong>50</strong> lifting workout XP</span>
          <span><strong>125</strong> max daily XP</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card auth-card--production">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead auth-lead">{description}</p>
          {children}
          {footer ? <div className="auth-card__footer">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
