'use client';

import { useEffect } from 'react';
import { useProfileStore } from '@/state/useProfileStore';

type Theme = 'light' | 'dark' | 'midnight';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Graphite (default)' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'light', label: 'Daylight' },
];

/**
 * Applies the selected theme to <html> via a data attribute (CSS hooks live in
 * globals.css) and optionally renders the picker control. Mounting this once
 * in the shell keeps every route themed without per-page wiring.
 */
export function ThemeController({ controls = false }: { controls?: boolean }) {
  const theme = useProfileStore((state) => state.ui.theme);
  const reducedMotion = useProfileStore((state) => state.ui.reducedMotion);
  const updateUi = useProfileStore((state) => state.updateUi);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'midnight') root.dataset.theme = theme;
    else root.removeAttribute('data-theme');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', reducedMotion);
  }, [reducedMotion]);

  if (!controls) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edgesoft bg-panelsoft/40 px-3 py-2.5">
      <span className="text-sm text-slate-300">Theme</span>
      <select
        aria-label="Color theme"
        className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-xs text-slate-200"
        value={theme}
        onChange={(event) => updateUi({ theme: event.target.value as Theme })}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
