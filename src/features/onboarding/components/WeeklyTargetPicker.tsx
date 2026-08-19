interface WeeklyTargetPickerProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function WeeklyTargetPicker({ value, onChange, error, disabled = false }: WeeklyTargetPickerProps) {
  return (
    <fieldset className="weekly-target-field" aria-describedby={error ? 'weekly-target-error' : 'weekly-target-hint'}>
      <legend>Weekly lifting target</legend>
      <p className="ui-field__hint" id="weekly-target-hint">Choose how many days you plan to lift each Monday–Sunday week. Cardio does not count toward this target.</p>
      <div className="weekly-target-picker" role="group" aria-label="Weekly lifting target">
        {[1, 2, 3, 4, 5, 6, 7].map((target) => (
          <button
            aria-pressed={value === target}
            className={`weekly-target-picker__option${value === target ? ' weekly-target-picker__option--selected' : ''}`}
            disabled={disabled}
            key={target}
            onClick={() => onChange(target)}
            type="button"
          >
            {target}
          </button>
        ))}
      </div>
      {error ? <p className="ui-field__error" id="weekly-target-error">{error}</p> : null}
    </fieldset>
  );
}
