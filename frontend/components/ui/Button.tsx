'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-signal-500 text-void hover:bg-signal-400 active:bg-signal-600 shadow-glow font-semibold',
  secondary:
    'bg-panelsoft text-slate-200 border border-edgesoft hover:border-signal-500/60 hover:text-white',
  ghost: 'bg-transparent text-slate-400 hover:bg-panelsoft hover:text-slate-100',
  danger: 'bg-alarm/15 text-alarm border border-alarm/40 hover:bg-alarm/25',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-6 text-base gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, fullWidth = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'hw-focus inline-flex select-none items-center justify-center rounded-xl',
        'font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
