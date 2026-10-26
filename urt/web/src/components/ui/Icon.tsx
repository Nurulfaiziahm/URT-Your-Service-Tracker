import type { SVGProps } from 'react';

const paths = {
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  team: 'M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 20v-1a6 6 0 0 1 12 0v1M19.2 14a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0M20.8 20a4 4 0 0 0-7.6 0',
  shield: 'M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4',
  external: 'M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  circleCheck: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-13 0 2.5 2.5L16 9',
  chevronLeft: 'm14 7-5 5 5 5',

  print: 'M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6Zm11-2h1',
  file: 'M14 2H4v20h16V8Zm0 0v6h6M8 13h8M8 17h6',
  image: 'M3 3h18v18H3Zm0 14 5-5 4 4 3-3 6 6M8 7h.01',
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Zm12 0v3m0 3v2m0 3v3',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z',
  chart: 'M3 3v18h18M7 16v-5m5 5V7m5 9v-8',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m-8 4-2-1 2-4 2 1 3-2V3h6v3l3 2 2-1 2 4-2 1v3l2 1-2 4-2-1-3 2v2H9v-2l-3-2-2 1-2-4 2-1Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  wallet: 'M3 6h18v15H3V3h15v3M21 11h-6v5h6m-4-2.5h1',
  logout: 'M9 21H3V3h6m7 4 5 5-5 5m5-5H9',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  collapse: 'M4 4h16v16H4Zm5 0v16m7-12-4 4 4 4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  copy: 'M9 9h12v12H9ZM15 9V3H3v12h6',
  check: 'm5 12 4 4L19 6',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
