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
      { label: 'Right now', href: '/now', icon: 'activity', section: 'main' },
      { label: 'Guided tools', href: '/tools', icon: 'activity', section: 'main' },
      { label: 'My support plan', href: '/support-plan', icon: 'shield', section: 'main' },
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
  '/': { title: 'Re-Hardwire - Dashboard', description: 'Guided self-help practices and optional coaching' },
  '/now': { title: 'Re-Hardwire - Right now', description: 'Choose a small next step for this moment' },
  '/now/': { title: 'Re-Hardwire - Right now', description: 'Choose a small next step for this moment' },
  '/chat': { title: 'Re-Hardwire - Chat', description: 'Check in with the coach service or use on-device tools offline' },
  '/tools': { title: 'Re-Hardwire - Guided tools', description: 'Guided coping practices that work offline' },
  '/tools/': { title: 'Re-Hardwire - Guided tools', description: 'Guided coping practices that work offline' },
  '/support-plan': { title: 'Re-Hardwire - My support plan', description: 'A personal support plan saved on this device' },
  '/support-plan/': { title: 'Re-Hardwire - My support plan', description: 'A personal support plan saved on this device' },
  '/protocol': { title: 'Re-Hardwire - Protocol', description: 'Select and configure your resilience protocol' },
  '/success': { title: 'Re-Hardwire - Success', description: 'Your wins and progress tracker' },
  '/account': { title: 'Re-Hardwire - Account', description: 'Manage your account and permissions' },
  '/settings': { title: 'Re-Hardwire - Settings', description: 'App preferences and configuration' },
  '/dev': { title: 'Re-Hardwire - Dev', description: 'System status and developer tools' },
  '/lab': { title: 'Re-Hardwire - Lab', description: 'Protocol routing laboratory and experiments' },
};
