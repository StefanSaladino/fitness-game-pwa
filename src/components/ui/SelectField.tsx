import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './SelectField.module.css';

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string;
  labelHidden?: boolean;
  compact?: boolean;
  searchable?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return Children.toArray(node).map(textFromNode).join(' ').trim();
}

function optionsFromChildren(children: ReactNode, group?: string): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const element = child as ReactElement<{ children?: ReactNode; disabled?: boolean; label?: string; value?: string | number }>;
    if (element.type === 'optgroup') {
      return optionsFromChildren(element.props.children, element.props.label);
    }
    if (element.type !== 'option') return [];

    return [{
      disabled: Boolean(element.props.disabled),
      group,
      label: textFromNode(element.props.children),
      value: String(element.props.value ?? textFromNode(element.props.children)),
    }];
  });
}

export const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(function SelectField({
  label,
  hint,
  error,
  labelHidden = false,
  compact = false,
  searchable,
  className = '',
  id,
  children,
  disabled,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  required,
  ...props
}, forwardedRef) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const triggerId = `${selectId}-trigger`;
  const listboxId = `${selectId}-listbox`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = (error ? errorId : hintId) || undefined;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelPosition, setPanelPosition] = useState({ left: 16, top: 0, width: 280 });
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const selectedValue = String(value ?? defaultValue ?? options[0]?.value ?? '');
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
  const showSearch = searchable ?? options.length > 8;
  const filteredOptions = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useImperativeHandle(forwardedRef, () => triggerRef.current as HTMLButtonElement);

  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 699px)').matches) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.parentElement?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function close({ restoreFocus = true } = {}) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function showOptions() {
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.max(280, rect.width);
      setPanelPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - panelWidth - 16)),
        top: rect.bottom + 8,
        width: panelWidth,
      });
    }
    setOpen(true);
  }

  function selectOption(nextValue: string) {
    const select = nativeSelectRef.current;
    if (!select) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    valueSetter?.call(select, nextValue);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showOptions();
      requestAnimationFrame(() => {
        if (showSearch) searchRef.current?.focus();
        else document.getElementById(`${selectId}-option-${selectedValue}`)?.focus();
      });
    }
  }

  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const overlay = open && typeof document !== 'undefined' ? createPortal(
    <>
      <button aria-label={`Close ${label}`} className={styles.backdrop} onClick={() => close()} type="button" />
      <div
        aria-label={`${label} options`}
        className={styles.panel}
        onKeyDown={handlePanelKeyDown}
        ref={panelRef}
        style={{
          '--select-left': `${panelPosition.left}px`,
          '--select-top': `${panelPosition.top}px`,
          '--select-width': `${panelPosition.width}px`,
        } as CSSProperties}
      >
        <div className={styles.sheetHeader}>
          <strong>{label}</strong>
          <button aria-label={`Close ${label}`} className={styles.close} onClick={() => close()} type="button">Done</button>
        </div>
        {showSearch && (
          <input
            aria-label={`Search ${label}`}
            className={styles.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search options"
            ref={searchRef}
            type="search"
            value={query}
          />
        )}
        <div className={styles.options} id={listboxId} role="listbox">
          {filteredOptions.map((option, index) => {
            const previousGroup = filteredOptions[index - 1]?.group;
            return (
              <div className={styles.optionGroup} key={`${option.group ?? 'ungrouped'}-${option.value}`}>
                {option.group && option.group !== previousGroup && <span className={styles.groupLabel}>{option.group}</span>}
                <button
                  aria-selected={option.value === selectedValue}
                  className={[styles.option, option.value === selectedValue ? styles.optionSelected : ''].filter(Boolean).join(' ')}
                  disabled={option.disabled}
                  id={`${selectId}-option-${option.value}`}
                  onClick={() => selectOption(option.value)}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {option.value === selectedValue && <span aria-hidden="true" className={styles.check}>✓</span>}
                </button>
              </div>
            );
          })}
          {filteredOptions.length === 0 && <p className={styles.empty}>No matching options.</p>}
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <div className={['ui-field', styles.root, compact ? styles.compact : '', className].filter(Boolean).join(' ')}>
      <label className={labelHidden ? styles.visuallyHidden : 'ui-field__label'} id={`${selectId}-label`} htmlFor={triggerId}>{label}</label>
      <button
        aria-controls={open ? listboxId : undefined}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className={[styles.trigger, error ? styles.triggerError : ''].filter(Boolean).join(' ')}
        disabled={disabled}
        id={triggerId}
        onBlur={(event) => onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>)}
        onClick={() => open ? close({ restoreFocus: false }) : showOptions()}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className={styles.value}>{selectedOption?.label || 'Select an option'}</span>
        <span aria-hidden="true" className={styles.chevron} />
      </button>

      <select
        aria-hidden="true"
        className={styles.nativeSelect}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        name={name}
        onChange={onChange}
        ref={nativeSelectRef}
        required={required}
        tabIndex={-1}
        value={value}
        {...props}
      >
        {children}
      </select>

      {overlay}

      {error && <span className="ui-field__error" id={errorId}>{error}</span>}
      {!error && hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
    </div>
  );
});
