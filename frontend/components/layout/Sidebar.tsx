'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { routes, getActiveRoute } from '@/lib/routing';
import { config } from '@/lib/config';
import { useChatStore } from '@/state/useChatStore';
import { useProtocolStore } from '@/state/useProtocolStore';
import { useProfileStore } from '@/state/useProfileStore';
import { engineLabel, useSystemStore } from '@/state/useSystemStore';
import { Icon, toIconName } from '@/components/ui';
import { shortProtocol } from '@/lib/format';

const STATUS_DOT = {
  unknown: 'bg-slate-600',
  checking: 'bg-warmth animate-blink',
  online: 'bg-win',
  offline: 'bg-alarm',
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const active = getActiveRoute(pathname);

  const status = useSystemStore((state) => state.status);
  const engine = useSystemStore(engineLabel);
  const check = useSystemStore((state) => state.check);

  const collapsed = useProfileStore((state) => state.ui.sidebarCollapsed);
  const updateUi = useProfileStore((state) => state.updateUi);

  const messageCount = useChatStore((state) => state.messages.length);
  const selectedProtocol = useProtocolStore((state) => state.selected);

  return (
    <aside
      className={[
        'hidden shrink-0 flex-col border-r border-edge bg-ink/70 backdrop-blur md:flex',
        collapsed ? 'w-[68px]' : 'w-64',
        'transition-[width] duration-200 ease-out',
      ].join(' ')}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-edge px-4">
        <Link href="/" aria-label="Re-Hardwire home" className="hw-focus shrink-0 rounded-lg">
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
        </Link>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-100">
              {config.app.name}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
              v{config.app.version}
            </p>
          </div>
        )}
      </div>

      <nav className="hw-scroll flex-1 overflow-y-auto px-2 py-3">
        {routes.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && <p className="hw-label mb-2 px-2">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active?.href === item.href;
                const badge =
                  item.href === '/chat' && messageCount > 0 ? messageCount : undefined;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'hw-focus flex items-center gap-2.5 rounded-lg px-2.5 py-2',
                        'text-sm transition-colors duration-150',
                        collapsed ? 'justify-center' : '',
                        isActive
                          ? 'bg-signal-500/10 text-signal-200'
                          : 'text-slate-400 hover:bg-panelsoft hover:text-slate-100',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <Icon
                        name={toIconName(item.icon)}
                        size={17}
                        className={['shrink-0', isActive ? 'text-signal-400' : ''].join(' ')}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge !== undefined && (
                            <span className="font-mono text-[10px] text-slate-500">{badge}</span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="space-y-2 border-t border-edge px-3 py-3">
          <p className="hw-label">Active protocol</p>
          <p className="truncate text-xs text-slate-300">
            {selectedProtocol ? shortProtocol(selectedProtocol) : 'Auto-route'}
          </p>
          <button
            type="button"
            onClick={() => void check()}
            className="hw-focus flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-panelsoft"
          >
            <span className={['h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[status]].join(' ')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {status}
              </span>
              <span className="block truncate text-[11px] text-slate-500">{engine}</span>
            </span>
          </button>
        </div>
      )}

      <div className="border-t border-edge px-3 py-3">
        <button
          type="button"
          onClick={() => updateUi({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hw-focus flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-slate-500 transition-colors hover:bg-panelsoft hover:text-slate-200"
        >
          <Icon name="menu" size={15} />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}