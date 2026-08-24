interface TopSetMarkProps {
  className?: string;
  size?: number;
}

export function TopSetMark({ className, size = 54 }: TopSetMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 64 40"
      width={size * 1.6}
    >
      <path d="M17 20h30" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
      <rect height="24" rx="3" stroke="currentColor" strokeWidth="4" width="8" x="10" y="8" />
      <rect height="32" rx="3" stroke="currentColor" strokeWidth="4" width="8" x="18" y="4" />
      <rect height="32" rx="3" stroke="currentColor" strokeWidth="4" width="8" x="38" y="4" />
      <rect height="24" rx="3" stroke="currentColor" strokeWidth="4" width="8" x="46" y="8" />
    </svg>
  );
}
