import styles from './WeeklyTargetPicker.module.css';

interface WeeklyTargetPickerProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function WeeklyTargetPicker({ value, onChange, error, disabled = false }: WeeklyTargetPickerProps) {
  return (
    <fieldset
      className={styles.fieldset}
      aria-describedby={error ? 'weekly-target-error' : 'weekly-target-hint'}
    >
      <legend>Weekly lifting target</legend>
      <p className={styles.hint} id="weekly-target-hint">
        How many days per week do you plan to lift? Cardio days do not count.
      </p>
      <div className={styles.options}>
        {[1, 2, 3, 4, 5, 6, 7].map((target) => (
          <button
            aria-pressed={value === target}
            className={`${styles.option}${value === target ? ` ${styles.selected}` : ''}`}
            disabled={disabled}
            key={target}
            onClick={() => onChange(target)}
            type="button"
          >
            {target}
          </button>
        ))}
      </div>
      {error ? <p className={styles.error} id="weekly-target-error">{error}</p> : null}
    </fieldset>
  );
}
