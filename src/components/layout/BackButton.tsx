import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../ui';
import styles from './BackButton.module.css';

interface BackButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  label?: string;
  text?: string;
}

export function BackButton({ className = '', label = 'Go back', text, ...buttonProps }: BackButtonProps) {
  return (
    <button
      {...buttonProps}
      aria-label={label}
      className={`${styles.button}${text ? ` ${styles.withText}` : ''}${className ? ` ${className}` : ''}`}
      type="button"
    >
      <Icon name="chevron-left" size={24} />
      {text ? <span>{text}</span> : null}
    </button>
  );
}
