interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ProgressBar({ value, max = 100, label, showValue = false }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const safeValue = clamp(value, 0, safeMax);
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className="ui-progress">
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        className="ui-progress__track"
        role="progressbar"
      >
        <span className="ui-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
      {showValue && <span className="ui-progress__value">{Math.round(percentage)}%</span>}
    </div>
  );
}
