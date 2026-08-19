import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}

export function Card({ children, className = '', title, action, eyebrow, ...props }: PropsWithChildren<CardProps>) {
  const classes = ['ui-card', className].filter(Boolean).join(' ');

  return (
    <article className={classes} {...props}>
      {(eyebrow || title || action) && (
        <header className="ui-card__header">
          <div>
            {eyebrow && <div className="ui-card__eyebrow">{eyebrow}</div>}
            {title && <h2 className="ui-card__title">{title}</h2>}
          </div>
          {action && <div className="ui-card__action">{action}</div>}
        </header>
      )}
      {children}
    </article>
  );
}
