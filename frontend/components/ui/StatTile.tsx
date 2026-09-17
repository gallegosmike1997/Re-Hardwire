'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: 'signal' | 'pulse' | 'win' | 'warmth' | 'alarm';
}

const TONES = {
  signal: 'text-signal-400',
  pulse: 'text-pulse-400',
  win: 'text-win',
  warmth: 'text-warmth',
  alarm: 'text-alarm',
} as const;

export function StatTile({ label, value, hint, icon, tone = 'signal' }: StatTileProps) {
  return (
    <div className="hw-panel flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="hw-label">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-100">
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <Icon name={icon} size={18} className={['shrink-0', TONES[tone]].join(' ')} />}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'activity', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="rounded-full border border-edgesoft bg-panelsoft p-3 text-slate-500">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export interface NoticeProps {
  tone?: 'info' | 'warn' | 'error' | 'success';
  children: ReactNode;
  onDismiss?: () => void;
}

const NOTICES = {
  info: 'border-signal-500/30 bg-signal-500/5 text-signal-200',
  warn: 'border-warmth/30 bg-warmth/5 text-warmth',
  error: 'border-alarm/35 bg-alarm/5 text-alarm',
  success: 'border-win/30 bg-win/5 text-win',
} as const;

export function Notice({ tone = 'info', children, onDismiss }: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={['flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed', NOTICES[tone]].join(' ')}
    >
      <Icon
        name={tone === 'success' ? 'check' : tone === 'info' ? 'activity' : 'alert'}
        size={15}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="hw-focus shrink-0 rounded text-current/70 hover:text-current"
        >
          <Icon name="stop" size={12} />
        </button>
      )}
    </div>
  );
}