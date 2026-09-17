'use client';

import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'signal' | 'pulse' | 'win' | 'warmth' | 'alarm';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-edgesoft bg-panelsoft text-slate-400',
  signal: 'border-signal-500/40 bg-signal-500/10 text-signal-300',
  pulse: 'border-pulse-500/40 bg-pulse-500/10 text-pulse-300',
  win: 'border-win/40 bg-win/10 text-win',
  warmth: 'border-warmth/40 bg-warmth/10 text-warmth',
  alarm: 'border-alarm/40 bg-alarm/10 text-alarm',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-[0.14em]',
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}

/** Maps an emotional-state string onto a badge tone. */
export function toneForState(state: string): BadgeTone {
  switch (state) {
    case 'stable':
      return 'win';
    case 'activated':
    case 'mixed':
      return 'warmth';
    case 'overwhelmed':
      return 'alarm';
    case 'depleted':
    case 'numb':
      return 'pulse';
    default:
      return 'neutral';
  }
}

/** Maps a routing action onto a badge tone. */
export function toneForAction(action: string): BadgeTone {
  switch (action) {
    case 'ground_and_reset':
    case 'escalate_support':
      return 'alarm';
    case 'reduce_load':
    case 'reflect_and_reframe':
      return 'warmth';
    case 'log_micro_win':
      return 'win';
    default:
      return 'signal';
  }
}