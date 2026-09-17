'use client';

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: 'signal' | 'pulse' | 'win' | 'warmth' | 'alarm';
  label?: string;
  showValue?: boolean;
  height?: number;
}

const FILLS = {
  signal: 'bg-signal-500',
  pulse: 'bg-pulse-500',
  win: 'bg-win',
  warmth: 'bg-warmth',
  alarm: 'bg-alarm',
} as const;

export function Progress({
  value,
  max = 1,
  tone = 'signal',
  label,
  showValue = false,
  height = 6,
}: ProgressProps) {
  const safeMax = max <= 0 ? 1 : max;
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const percent = Math.round(ratio * 100);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="hw-label">{label}</span>}
          {showValue && (
            <span className="font-mono text-[11px] text-slate-400">{percent}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'progress'}
        className="w-full overflow-hidden rounded-full bg-edge/80"
        style={{ height }}
      >
        <div
          className={['h-full rounded-full transition-[width] duration-500 ease-out', FILLS[tone]].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export interface SignalMeterProps {
  name: string;
  value: number;
  tone?: 'signal' | 'pulse' | 'win' | 'warmth' | 'alarm';
}

export function SignalMeter({ name, value, tone = 'signal' }: SignalMeterProps) {
  const ratio = Math.min(1, Math.max(0, value));
  const blocks = 14;
  const filled = Math.round(ratio * blocks);

  return (
    <div className="flex items-center gap-3">
      <span className="hw-label w-20 shrink-0">{name}</span>
      <div className="flex flex-1 items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: blocks }, (_, index) => (
          <span
            key={index}
            className={[
              'h-3 flex-1 rounded-sm transition-colors duration-300',
              index < filled ? FILLS[tone] : 'bg-edge/70',
            ].join(' ')}
          />
        ))}
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-slate-500">
        {value.toFixed(2)}
      </span>
      <span className="sr-only">
        {name} {Math.round(ratio * 100)} percent
      </span>
    </div>
  );
}