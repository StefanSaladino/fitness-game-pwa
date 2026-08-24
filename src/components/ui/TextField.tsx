import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingControl?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  leadingIcon,
  trailingControl,
  className = '',
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = (error ? errorId : hintId) || undefined;

  return (
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      <label className="ui-field__label" htmlFor={inputId}>{label}</label>
      <span className={`ui-field__control${error ? ' ui-field__control--error' : ''}`}>
        {leadingIcon && <span className="ui-field__icon">{leadingIcon}</span>}
        <input aria-describedby={describedBy} aria-invalid={Boolean(error)} id={inputId} {...props} />
        {trailingControl && <span className="ui-field__trailing">{trailingControl}</span>}
      </span>
      {error && <span className="ui-field__error" id={errorId}>{error}</span>}
      {!error && hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
    </div>
  );
}
