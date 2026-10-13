import type { ReactNode, SVGProps } from "react";

/** Small stroke-icon set (24×24, currentColor). Keeps the UI free of emoji. */
const PATHS: Record<string, ReactNode> = {
  explore: <path d="M4.04 4.69a.5.5 0 0 1 .65-.65l16 6.5a.5.5 0 0 1-.06.95l-6.12 1.58a2 2 0 0 0-1.44 1.43l-1.58 6.13a.5.5 0 0 1-.95.06z" />,
  live: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  study: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  surgery: (
    <>
      <path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
      <path d="M8 15a6 6 0 0 0 12 0v-3" />
      <circle cx="20" cy="10" r="2" />
    </>
  ),
  scalpel: (
    <>
      <path d="m14 4 6 6-8.5 8.5a2 2 0 0 1-1.4.6H6.5L4 21l.5-3.5v-3.6a2 2 0 0 1 .6-1.4z" />
      <path d="m10 8 6 6" />
    </>
  ),
  retractor: (
    <>
      <path d="m8 3-4 4 4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </>
  ),
  forceps: (
    <>
      <path d="M4 20 11 13" />
      <path d="M20 20 13 13" />
      <path d="M11 13 8.5 4.5M13 13l2.5-8.5" />
      <path d="M8.5 4.5h7" />
    </>
  ),
  clamp: (
    <>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M8 16 16 5M16 16 8 5" />
    </>
  ),
  suture: (
    <>
      <path d="M20 4 6 18" />
      <circle cx="19" cy="5" r="1.4" />
      <path d="M6 18c-1 1.6-2.5 2-3 1.5S3.5 17 5 16" />
      <path d="M9 14c2-.4 3 .8 5 .5" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </>
  ),
  torso: (
    <>
      <path d="M8 3h8l3 4v6l-2 8H7l-2-8V7z" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7v7M7 9.5 12 8l5 1.5M12 14l-3 7M12 14l3 7" />
    </>
  ),
  male: (
    <>
      <circle cx="10" cy="14" r="5" />
      <path d="m19 5-5.4 5.4M15 5h4v4" />
    </>
  ),
  female: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v8M9 19h6" />
    </>
  ),
  sound: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </>
  ),
  settings: (
    <>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" />
      <path d="M14 2v4M8 10v4M16 18v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  play: <path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12-7.5a.8.8 0 0 0 0-1.4l-12-7.5A.8.8 0 0 0 7 4.5z" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  next: (
    <>
      <path d="m5 4 10 8-10 8z" />
      <path d="M19 5v14" />
    </>
  ),
  prev: (
    <>
      <path d="m19 20-10-8 10-8z" />
      <path d="M5 19V5" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />,
  lungs: (
    <>
      <path d="M12 4v8" />
      <path d="M9 7C6 8 3 13 3 17c0 2 1.3 3 3 3 2 0 3-1.5 3-3.5z" />
      <path d="M15 7c3 1 6 6 6 10 0 2-1.300 3-3 3-2 0-3-1.500-3-3.500z" />
      <path d="M12 12c-1 1-2 1.500-3 1.500M12 12c1 1 2 1.500 3 1.500" />
    </>
  ),
  food: (
    <>
      <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7" />
    </>
  ),
  drop: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.900-3-5.500S12.500 5 12 2c-.5 3-2 5.400-4 7S5 13 5 15a7 7 0 0 0 7 7z" />,
  bolt: <path d="m13 2-9 12h8l-1 8 9-12h-8z" />,
  nerve: <path d="m13 2-9 12h8l-1 8 9-12h-8z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  alert: (
    <>
      <path d="m21.700 18-8-14a2 2 0 0 0-3.500 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.700-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  bulb: (
    <>
      <path d="M15 14c.2-1 .7-1.700 1.500-2.500 1-.9 1.500-2.200 1.500-3.500A6 6 0 0 0 6 8c0 1 .2 2.200 1.500 3.500.7.7 1.300 1.500 1.500 2.500" />
      <path d="M9 18h6M10 22h4" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sparkle: <path d="m12 3 1.900 5.800L20 11l-6.100 2.200L12 19l-1.900-5.800L4 11l6.100-2.200z" />,
  bone: <path d="M17 10c.7-.7 1.700 0 2.500 0a2.500 2.500 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.500 2.500 0 1 0-5 0c0 .8.7 1.800 0 2.500l-7 7c-.7.7-1.700 0-2.500 0a2.500 2.500 0 0 0 0 5c.3 0 .5.200.5.500a2.500 2.500 0 1 0 5 0c0-.8-.7-1.800 0-2.500z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4.500" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  abdomen: (
    <>
      <path d="M7 3c-2 3-2 6 0 9s2 6 0 9M17 3c2 3 2 6 0 9s-2 6 0 9" />
      <circle cx="12" cy="12" r="1.500" />
    </>
  ),
  tool: <path d="M14.700 6.300a1 1 0 0 0 0 1.400l1.600 1.600a1 1 0 0 0 1.400 0l3.800-3.800a6 6 0 0 1-7.900 7.900l-6.900 6.900a2.100 2.100 0 0 1-3-3l6.900-6.900a6 6 0 0 1 7.900-7.900z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  rotate: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.700" />
      <path d="M21 4v5h-5" />
    </>
  ),
  cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
