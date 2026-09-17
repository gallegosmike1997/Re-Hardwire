import os

base = '/home/kalimike/Re-Hardwire/frontend'

def wf(rel_path, content):
    full = os.path.join(base, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    print(f'Written: {rel_path} ({len(content)} chars)')

# ============ LIB FILES ============

wf('lib/routing.ts', """/**
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
""")

wf('lib/storage.ts', """/**
 * Re-Hardwire Storage Utilities
 */
const IS_BROWSER = typeof window !== 'undefined';

export interface StoredData<T> {
  data: T;
  timestamp: number;
}

export function getStorage<T>(key: string): T | null {
  if (!IS_BROWSER) return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed: StoredData<T> = JSON.parse(item);
    return parsed.data;
  } catch (e) {
    console.error('[storage] Failed to read key:', e);
    return null;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (!IS_BROWSER) return;
  try {
    const wrapper: StoredData<T> = { data: value, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(wrapper));
  } catch (e) {
    console.error('[storage] Failed to write key:', e);
  }
}

export function removeStorage(key: string): void {
  if (!IS_BROWSER) return;
  try { localStorage.removeItem(key); } catch (e) { console.error('[storage] Failed to remove:', e); }
}

export function clearStorage(): void {
  if (!IS_BROWSER) return;
  try { localStorage.clear(); } catch (e) { console.error('[storage] Failed to clear:', e); }
}
""")

print('\n=== LIB FILES COMPLETE ===')
