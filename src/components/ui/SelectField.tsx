import { useId, type SelectHTMLAttributes } from 'react';
import styles from './SelectField.module.css';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function SelectField({ label, hint, error, className = '', id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = (error ? errorId : hintId) || undefined;

  return (
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      <label className="ui-field__label" htmlFor={selectId}>{label}</label>
      <span className={`ui-field__control${error ? ' ui-field__control--error' : ''}`}>
        <select
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={styles.select}
          id={selectId}
          {...props}
        >
          {children}
        </select>
      </span>
      {error && <span className="ui-field__error" id={errorId}>{error}</span>}
      {!error && hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
    </div>
  );
}
