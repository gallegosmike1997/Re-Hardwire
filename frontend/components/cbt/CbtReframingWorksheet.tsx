'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const DISTORTIONS = [
  { id: 'catastrophizing', name: 'Catastrophizing', desc: 'Expecting the worst possible outcome.' },
  { id: 'all_or_nothing', name: 'All-or-Nothing', desc: 'Viewing situations in black-and-white terms.' },
  { id: 'mind_reading', name: 'Mind Reading', desc: 'Assuming you know what others are thinking.' },
  { id: 'overgeneralization', name: 'Overgeneralization', desc: 'Viewing a single event as a never-ending pattern.' },
];

export function CbtReframingWorksheet() {
  const [automaticThought, setAutomaticThought] = useState('');
  const [selectedDistortion, setSelectedDistortion] = useState(DISTORTIONS[0].id);
  const [balancedReframe, setBalancedReframe] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveReframe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!automaticThought.trim() || !balancedReframe.trim()) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card
      title="Cognitive Reframing Worksheet"
      subtitle="Identify cognitive distortions and re-anchor in balanced, objective perspective."
      glow
      padded
    >
      <form onSubmit={handleSaveReframe} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Automatic Thought</label>
          <Input
            value={automaticThought}
            onChange={(e) => setAutomaticThought(e.target.value)}
            placeholder="e.g. Everyone is going to notice if I make a mistake..."
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 font-mono uppercase tracking-wider">
            Cognitive Distortion Pattern
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISTORTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDistortion(d.id)}
                className={[
                  'hw-focus rounded-xl border p-2.5 text-left transition-all',
                  selectedDistortion === d.id
                    ? 'border-signal-500/60 bg-signal-500/10 text-slate-100'
                    : 'border-edgesoft bg-panelsoft/40 text-slate-400 hover:border-signal-500/30',
                ].join(' ')}
              >
                <p className="text-xs font-semibold">{d.name}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Balanced Alternative Reframe</label>
          <textarea
            value={balancedReframe}
            onChange={(e) => setBalancedReframe(e.target.value)}
            placeholder="Formulate a grounded, compassionate alternative perspective..."
            rows={3}
            className="w-full rounded-xl border border-edgesoft bg-void/70 p-3 text-sm text-slate-200 hw-focus"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? <Badge tone="win">Reframe Saved Locally</Badge> : <span />}
          <Button type="submit" variant="primary" size="md">
            Save Reframe
          </Button>
        </div>
      </form>
    </Card>
  );
}
