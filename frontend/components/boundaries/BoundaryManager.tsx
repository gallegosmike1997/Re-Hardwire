'use client';

import { useState } from 'react';
import { useRelationshipStore, type BoundaryRule } from '@/state/useRelationshipStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export function BoundaryManager() {
  const { boundaries, addBoundary, updateBoundary, deleteBoundary } = useRelationshipStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BoundaryRule['category']>('communication');
  const [rule, setRule] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rule.trim()) return;
    addBoundary({
      title: title.trim(),
      category,
      rule: rule.trim(),
      active: true,
    });
    setTitle('');
    setRule('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Healthy Relationship Boundaries</h2>
          <p className="text-xs text-slate-400">Protect your energy and establish clear interpersonal guardrails.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ New Boundary'}
        </Button>
      </div>

      {isAdding && (
        <Card title="Define a New Boundary" padded glow>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Boundary Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Evening Response Cutoff"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BoundaryRule['category'])}
                className="w-full rounded-xl border border-edgesoft bg-panelsoft px-3 py-2 text-sm text-slate-200 hw-focus"
              >
                <option value="communication">Communication</option>
                <option value="time">Time & Availability</option>
                <option value="energy">Energy Conservation</option>
                <option value="emotional">Emotional Capacity</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Boundary Rule / Script</label>
              <textarea
                value={rule}
                onChange={(e) => setRule(e.target.value)}
                placeholder="Describe the clear, compassionate rule..."
                rows={3}
                className="w-full rounded-xl border border-edgesoft bg-panelsoft p-3 text-sm text-slate-200 hw-focus"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Boundary
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {boundaries.map((b) => (
          <Card key={b.id} padded className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-200">{b.title}</span>
                <Badge tone={b.active ? 'signal' : 'neutral'}>
                  {b.category} • {b.active ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{b.rule}</p>
            </div>
            <div className="flex items-center justify-between border-t border-edge/50 pt-3">
              <button
                type="button"
                onClick={() => updateBoundary(b.id, { active: !b.active })}
                className="text-xs font-medium text-signal-400 hover:text-signal-300"
              >
                {b.active ? 'Pause Rule' : 'Activate Rule'}
              </button>
              <button
                type="button"
                onClick={() => deleteBoundary(b.id)}
                className="text-xs font-medium text-alarm hover:text-alarm/80"
              >
                Remove
              </button>
            </div>
          </Card>
        ))}
        {boundaries.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-edge p-8 text-center text-xs text-slate-500">
            No boundaries defined yet. Click &quot;+ New Boundary&quot; above to set your first guardrail.
          </div>
        )}
      </div>
    </div>
  );
}
