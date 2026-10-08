'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, toIconName } from '@/components/ui/Icon';
import { getActiveRoute, routes } from '@/lib/routing';

const primaryHrefs = ['/', '/tools', '/chat', '/support-plan'];
const primaryLabels: Record<string, string> = {
  '/': 'Home',
  '/tools': 'Tools',
  '/chat': 'Chat',
  '/support-plan': 'My plan',
};

export function MobileNav() {
  const pathname = usePathname();
  const active = getActiveRoute(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRoutes = routes.flatMap((group) => group.items).filter((item) => !primaryHrefs.includes(item.href));

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close more navigation"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-void/55 backdrop-blur-[2px] md:hidden"
        />
      )}
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] print:hidden md:hidden"
      >
        {moreOpen && (
          <div
            id="mobile-more-menu"
            className="absolute bottom-[calc(100%+0.65rem)] right-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-ink/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-2 px-2">
              <p className="text-sm font-semibold text-slate-100">More spaces</p>
              <p className="mt-0.5 text-xs text-slate-500">Progress, preferences, and app details</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {moreRoutes.map((item) => {
                const isActive = active?.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'hw-focus flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                      isActive ? 'bg-signal-500/10 text-signal-300' : 'text-slate-400 hover:bg-panelsoft hover:text-slate-100',
                    ].join(' ')}
                  >
                    <Icon name={toIconName(item.icon)} size={16} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-[38rem] items-stretch justify-around rounded-2xl border border-white/10 bg-ink/90 px-1 py-1.5 shadow-[0_14px_44px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          {primaryHrefs.map((href) => {
            const item = routes.flatMap((group) => group.items).find((route) => route.href === href);
            if (!item) return null;
            const isActive = active?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'hw-focus flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
                  isActive ? 'bg-signal-500/10 text-signal-300' : 'text-slate-500 hover:text-slate-200',
                ].join(' ')}
              >
                <Icon name={toIconName(item.icon)} size={18} />
                <span className="truncate">{primaryLabels[href]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
            className={[
              'hw-focus flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
              moreOpen || (active && !primaryHrefs.includes(active.href)) ? 'bg-signal-500/10 text-signal-300' : 'text-slate-500 hover:text-slate-200',
            ].join(' ')}
          >
            <Icon name={moreOpen ? 'close' : 'menu'} size={18} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
