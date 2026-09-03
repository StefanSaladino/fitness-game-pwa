import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'workout'
  | 'groups'
  | 'progress'
  | 'profile'
  | 'calendar'
  | 'trophy'
  | 'settings'
  | 'logout'
  | 'flame'
  | 'arrow-right'
  | 'chevron-left'
  | 'check';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, string[]> = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10.5V20h13v-9.5', 'M9.5 20v-6h5v6'],
  workout: ['M4 9v6', 'M7 7v10', 'M17 7v10', 'M20 9v6', 'M7 12h10'],
  groups: ['M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M15.5 10a2.5 2.5 0 1 0 0-5', 'M3 20v-2.2C3 15.7 5.2 14 8 14h1c2.8 0 5 1.7 5 3.8V20', 'M15 14c3.3 0 6 1.6 6 4v2'],
  progress: ['M5 20V11', 'M12 20V4', 'M19 20v-6'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z', 'M8 2v4', 'M16 2v4', 'M3 9h18'],
  trophy: ['M8 4h8v4a4 4 0 0 1-8 0V4Z', 'M8 6H4v1a5 5 0 0 0 5 5', 'M16 6h4v1a5 5 0 0 1-5 5', 'M12 12v5', 'M8 21h8', 'M9 17h6'],
  settings: [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    'M9.4 3.2h5.2l.6 2.2c.6.2 1.1.5 1.6.9l2.1-.7 2.6 4.5-1.6 1.5c.1.6.1 1.2 0 1.8l1.6 1.5-2.6 4.5-2.1-.7c-.5.4-1 .7-1.6.9l-.6 2.2H9.4l-.6-2.2c-.6-.2-1.1-.5-1.6-.9l-2.1.7-2.6-4.5 1.6-1.5a7 7 0 0 1 0-1.8L2.5 10l2.6-4.5 2.1.7c.5-.4 1-.7 1.6-.9l.6-2.1Z',
  ],
  logout: ['M10 4H5v16h5', 'M14 8l4 4-4 4', 'M18 12H9'],
  flame: ['M12.5 3.5c.5 4-2.5 5-1.5 8 1-1 2-2 2-4 3 2 5 5 5 8a6 6 0 0 1-12 0c0-4 2.5-7.5 6-10-.2 2.5.8 4 2 4.5 0-3 1.5-5 3.5-6.5Z'],
  'arrow-right': ['M5 12h14', 'M14 7l5 5-5 5'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  check: ['m5 12 4 4L19 6'],
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name].map((path) => (
        <path
          d={path}
          key={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}
