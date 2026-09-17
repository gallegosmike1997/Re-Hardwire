'use client';

/**
 * Scaffold: logged-wins list for the Success surface.
 *
 * Backed by `useSuccessStore` (local storage) with per-win delete. The richer
 * `WinCard` component renders individual wins; this is the list wrapper the
 * scaffold spec names.
 */
import { useEffect } from 'react';
import { useSuccessStore } from '@/state/useSuccessStore';
import { formatRelative } from '@/lib/format';
import { Button, EmptyState, Icon } from '@/components/ui';

export function WinsList() {
  const wins = useSuccessStore((state) => state.wins);
  const hydrate = useSuccessStore((state) => state.hydrate);
  const removeWin = useSuccessStore((state) => state.removeWin);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (wins.length === 0) {
    return (
      <EmptyState
        icon="trophy"
        title="No wins logged yet"
        description="Log one small thing that moved today. The record compounds."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {wins.map((win) => (
        <li
          key={win.id}
          className="hw-panel flex items-start gap-2.5 px-3 py-2.5"
        >
          <Icon name="check" size={15} className="mt-0.5 shrink-0 text-win" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-slate-200">{win.text}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">
              {formatRelative(win.createdAt)}
              {win.protocol ? ` · ${win.protocol}` : ''} · impact {win.impact}/5
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeWin(win.id)}
            aria-label={`Delete win: ${win.text.slice(0, 40)}`}
          >
            <Icon name="trash" size={13} />
          </Button>
        </li>
      ))}
    </ul>
  );
}
