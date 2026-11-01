'use client';

import { useEffect, useState } from 'react';
import useRouter from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { navItems } from '@/lib/routing';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const filtered = navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.href.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-void/80 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-xl">
        <Card title="Quick Command Palette (Ctrl+K)" subtitle="Navigate spaces instantly with keyboard shortcuts." glow padded>
          <div className="space-y-3">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or page (e.g. Chat, Support, Boundaries)..."
              className="w-full rounded-xl border border-edgesoft bg-void/80 p-3 text-sm text-slate-100 hw-focus"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filtered.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-panelsoft transition-colors text-xs text-slate-200"
                >
                  <Icon name="check" size={14} className="text-signal-400" />
                  <span>{item.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-slate-500">{item.href}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
