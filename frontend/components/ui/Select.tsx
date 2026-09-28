'use client';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  onChange: (value: string) => void;
  value?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Select({ value, options, onChange, disabled, label, className }: SelectProps) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      {...(value === undefined ? {} : { value })}
      className={[
        'hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-xs text-slate-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
