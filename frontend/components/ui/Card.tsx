'use client';

import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  glow?: boolean;
}

export function Card({
  title,
  subtitle,
  action,
  padded = true,
  glow = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section
      className={[
        'hw-panel relative overflow-hidden',
        glow ? 'shadow-glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-edge/70 px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold tracking-tight text-slate-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}