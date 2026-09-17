/**
 * Re-Hardwire Routing Configuration
 */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  section: string;
  badge?: number;
}

export interface RouteGroup {
  label: string;
  items: NavItem[];
}

export const routes: RouteGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Home', href: '/', icon: 'home', section: 'main' },
      { label: 'Chat', href: '/chat', icon: 'chat', section: 'main' },
      { label: 'Protocol', href: '/protocol', icon: 'shield', section: 'main' },
      { label: 'Success', href: '/success', icon: 'trophy', section: 'main' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Lab', href: '/lab', icon: 'flask', section: 'tools' },
      { label: 'Dev', href: '/dev', icon: 'code', section: 'tools' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Account', href: '/account', icon: 'person', section: 'account' },
      { label: 'Settings', href: '/settings', icon: 'settings', section: 'account' },
    ],
  },
];

export const navItems: NavItem[] = routes.flatMap((group) => group.items);

export function getActiveRoute(pathname: string): NavItem | undefined {
  return navItems.find((item) => {
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname.startsWith(item.href + '/');
  });
}

export const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'Re-Hardwire - Dashboard', description: 'AI-powered resilience coaching dashboard' },
  '/chat': { title: 'Re-Hardwire - Chat', description: 'Talk to your AI resilience coach' },
  '/protocol': { title: 'Re-Hardwire - Protocol', description: 'Select and configure your resilience protocol' },
  '/success': { title: 'Re-Hardwire - Success', description: 'Your wins and progress tracker' },
  '/account': { title: 'Re-Hardwire - Account', description: 'Manage your account and permissions' },
  '/settings': { title: 'Re-Hardwire - Settings', description: 'App preferences and configuration' },
  '/dev': { title: 'Re-Hardwire - Dev', description: 'System status and developer tools' },
  '/lab': { title: 'Re-Hardwire - Lab', description: 'Protocol routing laboratory and experiments' },
};
