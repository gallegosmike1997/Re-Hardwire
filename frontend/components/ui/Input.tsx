'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const FIELD = [
  'hw-focus w-full rounded-lg border border-edgesoft bg-ink/80 px-3 py-2',
  'text-sm text-slate-100 placeholder:text-slate-600',
  'transition-colors duration-150 hover:border-signal-500/40 focus:border-signal-500',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="hw-label mb-1.5 block">
          {label}
        </label>
      )}
      <input id={inputId} ref={ref} className={[FIELD, className].filter(Boolean).join(' ')} {...rest} />
      {hint && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className = '', id, rows = 4, ...rest },
  ref,
) {
  const areaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={areaId} className="hw-label mb-1.5 block">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        ref={ref}
        rows={rows}
        className={[FIELD, 'hw-scroll resize-none leading-relaxed', className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {hint && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
    </div>
  );
});

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <label
      className={[
        'flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-edge/70',
        'bg-panelsoft/50 px-3 py-2.5 transition-colors hover:border-signal-500/40',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-sm text-slate-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
            {description}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="hw-focus mt-0.5 h-4 w-4 shrink-0 accent-signal-500"
      />
    </label>
  );
}