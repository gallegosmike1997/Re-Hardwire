'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

export function WearCompanionCard() {
  return (
    <Card title="Wearable & Companion Ready" subtitle="Optimized for watch surfaces and compact displays.">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-edgesoft bg-panelsoft/50 p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-300">
            <Icon name="activity" size={20} />
          </span>
          <div>
            <Badge tone="signal">Remote Compose</Badge>
            <p className="mt-1 text-xs font-semibold text-slate-100">Quick Grounding Pulse</p>
            <p className="text-[11px] text-slate-400">Ready for Wear OS watch face complications</p>
          </div>
        </div>
        <Link
          href="/now"
          className="hw-focus rounded-xl bg-signal-500 px-3 py-2 text-xs font-semibold text-void hover:bg-signal-400"
        >
          Pulse
        </Link>
      </div>
    </Card>
  );
}
