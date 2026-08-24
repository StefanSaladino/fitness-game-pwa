import type { SVGProps } from 'react';

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" {...props} />;
}

export function MailIcon() {
  return (
    <IconBase>
      <rect height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="19" x="2.5" y="4.5" />
      <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function LockIcon() {
  return (
    <IconBase>
      <rect height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="15" x="4.5" y="10" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function UserIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 20c.65-4 2.8-6 6.5-6s5.85 2 6.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function EyeIcon({ hidden = false }: { hidden?: boolean }) {
  return (
    <IconBase>
      <path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      {hidden ? <path d="m4 4 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /> : null}
    </IconBase>
  );
}
