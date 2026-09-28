'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getActiveRoute, pageMeta, routes } from '@/lib/routing';
import { config } from '@/lib/config';
import { engineLabel, useSystemStore } from '@/state/useSystemStore';
import { Badge, Button, Icon, toIconName } from '@/components/ui';

const STATUS_TONE = {
  unknown: 'neutral',
  checking: 'warmth',
  online: 'win',
  offline: 'alarm',
} as const;

export function Header() {
  const pathname = usePathname();
  const active = getActiveRoute(pathname);
  const meta = pageMeta[pathname];

  const status = useSystemStore((state) => state.status);
  const engine = useSystemStore(engineLabel);
  const check = useSystemStore((state) => state.check);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-ink/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          className="hw-focus -ml-1 rounded-lg p-2 text-slate-400 hover:bg-panelsoft hover:text-slate-100 md:hidden"
        >
          <Icon name="menu" size={18} />
        </button>

        <Link href="/" aria-label="Re-Hardwire home" className="hw-focus shrink-0 rounded-lg md:hidden">
          <Image src="/logo.svg" alt="" width={32} height={32} priority />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
            {meta?.title.replace(`${config.app.name} - `, '') ?? active?.label ?? config.app.name}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {meta?.description ?? 'Resilience coaching, routed turn by turn.'}
          </p>
        </div>

        <Badge tone={STATUS_TONE[status]} className="hidden sm:inline-flex">
          {status}
        </Badge>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => void check()}
          aria-label="Re-check backend status"
          title={engine}
        >
          <Icon name="refresh" size={15} />
          <span className="hidden lg:inline">Check</span>
        </Button>
      </div>

      {menuOpen && (
        <nav className="hw-scroll max-h-[60vh] overflow-y-auto border-t border-edge px-3 pb-3 md:hidden">
          {routes.map((group) => (
            <div key={group.label} className="pt-3">
              <p className="hw-label mb-1.5 px-1">{group.label}</p>
              <ul className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => {
                  const isActive = active?.href === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={[
                          'hw-focus flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs',
                          isActive
                            ? 'bg-signal-500/10 text-signal-200'
                            : 'text-slate-400 hover:bg-panelsoft hover:text-slate-100',
                        ].join(' ')}
                      >
                        <Icon name={toIconName(item.icon)} size={15} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}