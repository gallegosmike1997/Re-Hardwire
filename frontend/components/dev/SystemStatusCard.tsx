'use client';

import { Icon } from '@/components/ui/Icon';

export interface SystemStatusCardProps {
  title: string;
  status: 'online' | 'offline' | 'unknown' | string;
  detail?: string;
  loading?: boolean;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-win', text: 'text-win', label: 'Online' },
  offline: { dot: 'bg-alarm', text: 'text-alarm', label: 'Offline' },
  unknown: { dot: 'bg-slate-500', text: 'text-slate-400', label: 'Unknown' },
};

/**
 * Compact status row used on the Dev dashboard for each backend subsystem.
 */
export function SystemStatusCard({ title, status, detail, loading = false }: SystemStatusCardProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-edgesoft bg-panelsoft/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon name="activity" size={15} className="shrink-0 text-slate-500" />
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-200">{title}</p>
          {detail && <p className="truncate text-xs text-slate-500">{detail}</p>}
        </div>
      </div>
      <span
        className={[
          'flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider',
          style.text,
        ].join(' ')}
        role="status"
        aria-label={`${title}: ${style.label}`}
      >
        <span className={['h-2 w-2 rounded-full', loading ? 'animate-pulse bg-pulse-500' : style.dot].join(' ')} />
        {loading ? 'checking' : style.label}
      </span>
    </div>
  );
}
