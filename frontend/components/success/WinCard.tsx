'use client';

import { Badge, Button, Icon } from '@/components/ui';
import { formatRelative, truncate } from '@/lib/format';
import type { Win } from '@/state/useSuccessStore';

export interface WinCardProps {
  win: Win;
  onRemove?: (id: string) => void;
}

const IMPACT_TONE = ['neutral', 'alarm', 'warmth', 'signal', 'win', 'win'] as const;

export function WinCard({ win, onRemove }: WinCardProps) {
  const tone = IMPACT_TONE[Math.min(5, Math.max(0, win.impact))];

  return (
    <article className="hw-panel flex items-start gap-3 p-3.5">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-win/40 bg-win/10 text-win"
      >
        <Icon name="check" size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-slate-200">{win.text}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={tone}>Impact {win.impact}/5</Badge>
          {win.protocol && <Badge tone="signal">{truncate(win.protocol, 28)}</Badge>}
          <span className="font-mono text-[10px] text-slate-600">
            {formatRelative(win.createdAt)}
          </span>
        </div>
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(win.id)}
          aria-label={`Delete win: ${truncate(win.text, 40)}`}
          title="Delete this win"
        >
          <Icon name="trash" size={14} />
        </Button>
      )}
    </article>
  );
}

export default WinCard;