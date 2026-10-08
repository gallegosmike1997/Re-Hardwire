/**
 * Inline SVG icon set.
 *
 * The project ships without an icon package, so every glyph is a small
 * hand-written path. `NavItem.icon` in `lib/routing.ts` uses the short names
 * below, which are re-exported as `IconName`.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'chat'
  | 'shield'
  | 'trophy'
  | 'flask'
  | 'code'
  | 'person'
  | 'settings'
  | 'send'
  | 'mic'
  | 'refresh'
  | 'trash'
  | 'check'
  | 'alert'
  | 'chevron'
  | 'play'
  | 'stop'
  | 'activity'
  | 'menu'
  | 'close';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  chat: 'M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4Z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
  code: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.1a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 15H2.5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6V4.5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  trash: 'M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  check: 'M4 12.5 9 18 20 6',
  alert: 'M12 9v5M12 18h.01M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  chevron: 'M9 6l6 6-6 6',
  play: 'M7 4l13 8-13 8V4Z',
  stop: 'M6 6h12v12H6z',
  activity: 'M22 12h-4l-3 8-4-16-3 8H2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M18 6 6 18',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

const ICON_NAMES = new Set<string>(Object.keys(PATHS));

/**
 * Narrow an arbitrary string (e.g. `NavItem.icon` from `lib/routing.ts`, which
 * is typed as `string`) to a known icon name.
 */
export function isIconName(value: string): value is IconName {
  return ICON_NAMES.has(value);
}

/** Resolve a loose icon string, falling back when it is not in the set. */
export function toIconName(value: string, fallback: IconName = 'activity'): IconName {
  return isIconName(value) ? value : fallback;
}

export function Icon({ name, size = 18, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
