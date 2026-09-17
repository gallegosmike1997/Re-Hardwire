'use client';

/**
 * Scaffold: circular progress indicator for the Success surface.
 *
 * Renders a 0-1 value as an SVG ring. Kept dependency-free (no chart lib).
 */
interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: 'signal' | 'pulse' | 'win' | 'warmth' | 'alarm';
}

const STROKES = {
  signal: 'stroke-signal-500',
  pulse: 'stroke-pulse-500',
  win: 'stroke-win',
  warmth: 'stroke-warmth',
  alarm: 'stroke-alarm',
} as const;

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  tone = 'win',
}: ProgressRingProps) {
  const ratio = Math.min(1, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const percent = Math.round(ratio * 100);

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={label ?? `Progress ${percent} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-edge"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={['transition-[stroke-dashoffset] duration-700 ease-out', STROKES[tone]].join(' ')}
        />
      </svg>
      <div className="-mt-14 mb-6 text-center" aria-hidden="true">
        <p className="text-xl font-semibold text-slate-100">{percent}%</p>
      </div>
      {label && <p className="hw-label">{label}</p>}
      <span className="sr-only">{percent} percent complete</span>
    </div>
  );
}
