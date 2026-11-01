'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { computeLocalRoute, getContextualProtocol } from '@/lib/offlineRouting';

type MoodOption = {
  label: string;
  state: 'stable' | 'activated' | 'overwhelmed' | 'depleted';
  description: string;
  recommendedProtocol: string;
  href: string;
  icon: IconName;
};

type ContextHints = {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  stressLevel?: 'low' | 'medium' | 'high';
  energyLevel?: 'low' | 'medium' | 'high';
};

const MOODS: MoodOption[] = [
  { label: 'Calm & Steady', state: 'stable', description: 'Good baseline, ready for steady momentum.', recommendedProtocol: 'Momentum & Load', href: '/tools#next-step', icon: 'check' },
  { label: 'Activated / Tense', state: 'activated', description: 'High operational tension running through your system.', recommendedProtocol: 'Ground & Regulate', href: '/tools#grounding', icon: 'activity' },
  { label: 'Overwhelmed', state: 'overwhelmed', description: 'Too many signals hitting you at once.', recommendedProtocol: 'Stabilise & Breathe', href: '/tools#breathing', icon: 'refresh' },
  { label: 'Depleted / Flat', state: 'depleted', description: 'Low energy, rest deficit is compounding.', recommendedProtocol: 'Ground & Regulate', href: '/tools#grounding', icon: 'shield' },
];

export function MoodCheckInWidget() {
  const [selected, setSelected] = useState<MoodOption | null>(null);
  const [contextHints, setContextHints] = useState<ContextHints | null>(null);
  const [showContextualInfo, setShowContextualInfo] = useState(false);

  useEffect(() => {
    // Contextual hints will be populated when protocol is computed
  }, [selected]);

  const handleProtocolChange = (userText: string) => {
    if (!userText.trim()) return;
    
    // Get context-aware protocol from the routing engine
    const protocolInfo = getContextualProtocol(userText);
    setContextHints(protocolInfo.contextualHints);
    setShowContextualInfo(true);
  };

  return (
    <Card title="How is your system right now?" subtitle="Take a 5-second pulse check to match your practice." glow={!selected}>
      {!selected ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              type="button"
              onClick={() => setSelected(mood)}
              className="hw-focus flex items-center gap-3 rounded-xl border border-edgesoft bg-panelsoft/55 p-3.5 text-left transition-all hover:border-signal-500/50 hover:bg-panelsoft"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-500/10 text-signal-300">
                <Icon name={mood.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{mood.label}</p>
                <p className="truncate text-xs text-slate-400">{mood.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-signal-500/30 bg-signal-500/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="signal">Recommended Match</Badge>
              <h3 className="mt-2 text-base font-semibold text-slate-100">{selected.recommendedProtocol}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{selected.description}</p>
              {contextHints && showContextualInfo && (
                <div className="mt-3 p-3 bg-panelsoft rounded border border-signal-500/20">
                  <p className="text-xs font-medium text-slate-300">Context-aware hints:</p>
                  <ul className="text-slate-400 text-sm space-y-1">
                    {contextHints.timeOfDay && <li key="timeOfDay">Time of day: {contextHints.timeOfDay}</li>}
                    {contextHints.stressLevel && <li key="stressLevel">Stress level: {contextHints.stressLevel}</li>}
                    {contextHints.energyLevel && <li key="energyLevel">Energy level: {contextHints.energyLevel}</li>}
                  </ul>
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              Change
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Link href={selected.href} className="hw-focus inline-flex min-h-11 items-center gap-2 rounded-xl bg-signal-500 px-4 py-2.5 text-sm font-semibold text-void hover:bg-signal-400">
              Start recommended practice <Icon name="chevron" size={16} />
            </Link>
            <Link href="/chat" className="hw-focus inline-flex min-h-11 items-center gap-2 rounded-xl border border-edgesoft bg-panelsoft px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-panelsoft/80">
              Talk it through <Icon name="chat" size={16} />
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
