'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { usePeerCircleStore } from '@/state/usePeerCircleStore';

export function PeerCircleCard() {
  const { checkIns, hydrate, addCheckIn, deleteCheckIn } = usePeerCircleStore();
  const [alias, setAlias] = useState('Quiet Oak');
  const [note, setNote] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    addCheckIn({
      circleName: 'Local Peer Circle',
      anonymousAlias: alias.trim() || 'Anonymous Friend',
      moodBadge: 'STABLE',
      sharedNote: note.trim(),
    });
    setNote('');
    setIsSharing(false);
  };

  return (
    <Card
      title="Peer Support Circle &amp; Anonymous Check-In"
      subtitle="Share anonymous micro-wins and encouragement with trusted peer cohorts."
      glow
      padded
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge tone="win">Air-Gapped Group Privacy</Badge>
          <Button size="sm" onClick={() => setIsSharing(!isSharing)}>
            {isSharing ? 'Cancel' : '+ New Check-In'}
          </Button>
        </div>

        {isSharing && (
          <form onSubmit={handleShare} className="space-y-3 rounded-xl border border-edgesoft bg-panelsoft/40 p-4">
            <Input
              label="Anonymous Alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. Blue Heron or Gentle Breeze"
            />
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Micro-Win / Encoded Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Share a small grounding win with your circle..."
                rows={2}
                className="w-full rounded-xl border border-edgesoft bg-void/70 p-3 text-sm text-slate-200 hw-focus"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsSharing(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Share Anonymously
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {checkIns.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-edgesoft bg-panelsoft/30 p-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200">{item.anonymousAlias}</span>
                  <Badge tone="signal">{item.circleName}</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.sharedNote}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteCheckIn(item.id)}
                className="text-[11px] text-slate-500 hover:text-alarm shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
