'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getActiveRoute, pageMeta } from '@/lib/routing';
import { config } from '@/lib/config';
import { engineLabel, useSystemStore } from '@/state/useSystemStore';
import { Badge, Button, Icon } from '@/components/ui';

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

  return (
    <header role="banner" className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Re-Hardwire home" className="hw-focus shrink-0 rounded-lg md:hidden">
          <Image src="/logo.svg" alt="" width={32} height={32} priority />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
            {meta?.title.replace(`${config.app.name} - `, '') ?? active?.label ?? config.app.name}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {meta?.description ?? 'Guided self-help practices, with optional chat when available.'}
          </p>
        </div>

        <a
          href="tel:988"
          aria-label="Call 988 in the United States for emotional crisis support"
          title="U.S. 988 crisis support · a phone connection is required"
          className="hw-focus inline-flex h-9 shrink-0 items-center rounded-lg border border-alarm/25 bg-alarm/5 px-2.5 text-xs font-semibold text-alarm transition-colors hover:bg-alarm/10 sm:px-3"
        >
          <span className="sm:hidden">988</span>
          <span className="hidden sm:inline">U.S. 988</span>
        </a>

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

    </header>
  );
}
