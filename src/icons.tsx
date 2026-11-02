import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const base: Props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const CarIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11" />
    <path d="M3.5 13.5A2.5 2.5 0 0 1 6 11h12a2.5 2.5 0 0 1 2.5 2.5V17H3.5z" />
    <path d="M5.5 17v1.5M18.5 17v1.5M7 14h1.5M15.5 14H17" />
  </svg>
);

export const PeopleIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3" />
    <path d="M6 19c0-3 2.7-5 6-5s6 2 6 5" />
    <circle cx="5" cy="9.5" r="2" />
    <circle cx="19" cy="9.5" r="2" />
    <path d="M2 17.5c0-1.7 1.2-3 3-3.3M22 17.5c0-1.7-1.2-3-3-3.3" />
  </svg>
);

export const CalendarIcon = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" strokeWidth={2.2} />
  </svg>
);

export const ClockIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const PlaneIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 3c.9 0 1.5.9 1.5 2v4.5l7 4v2l-7-2V18l2 1.5v1.5L12 20l-3.5 1v-1.5l2-1.5v-4.5l-7 2v-2l7-4V5c0-1.1.6-2 1.5-2z" />
  </svg>
);

export const HourglassIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M6.5 3h11M6.5 21h11" />
    <path d="M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9" />
  </svg>
);

export const ShieldIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const PhoneIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

export const UserIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" />
  </svg>
);
