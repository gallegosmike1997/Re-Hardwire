'use client';

import { Icon } from '@/components/ui/Icon';

export interface PermissionsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

/**
 * A single permission row on the Account page.
 *
 * Self-contained on purpose: no store imports, so it can be reused anywhere a
 * boolean permission needs flipping.
 */
export function PermissionsToggle({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: PermissionsToggleProps) {
  return (
    <label
      className={[
        'flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5 transition-colors',
        checked
          ? 'border-signal-500/40 bg-signal-500/5'
          : 'border-edgesoft bg-transparent',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-signal-500/40',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <Icon
          name={checked ? 'check' : 'shield'}
          size={15}
          className={checked ? 'mt-0.5 shrink-0 text-signal-400' : 'mt-0.5 shrink-0 text-slate-600'}
        />
        <span className="min-w-0">
          <span className="block text-sm text-slate-200">{label}</span>
          {description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              {description}
            </span>
          )}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-signal-500"
      />
    </label>
  );
}
