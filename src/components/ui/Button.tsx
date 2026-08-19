import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    fullWidth ? 'ui-button--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type={type} {...props}>
      {leadingIcon && <span className="ui-button__icon">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="ui-button__icon">{trailingIcon}</span>}
    </button>
  );
}
