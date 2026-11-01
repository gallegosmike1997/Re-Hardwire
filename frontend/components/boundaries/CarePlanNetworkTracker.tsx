'use client';

import { useState } from 'react';
import { useRelationshipStore, type NetworkContact } from '@/state/useRelationshipStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export function CarePlanNetworkTracker() {
  const { contacts, addContact, updateContact, deleteContact } = useRelationshipStore();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<NetworkContact['role']>('ally');
  const [contactInfo, setContactInfo] = useState('');
  const [boundaryNotes, setBoundaryNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addContact({
      name: name.trim(),
      role,
      contactInfo: contactInfo.trim(),
      boundaryNotes: boundaryNotes.trim(),
      activeInCarePlan: true,
    });
    setName('');
    setContactInfo('');
    setBoundaryNotes('');
    setIsAdding(false);
  };

  const roleLabel = (r: NetworkContact['role']) => {
    switch (r) {
      case 'ally': return 'Support Ally';
      case 'accountability': return 'Accountability Partner';
      case 'professional': return 'Professional / Clinician';
      case 'trusted': return 'Trusted Contact';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Care Plan Support Network</h2>
          <p className="text-xs text-slate-400">Track allies and professionals involved in your self-created support plan.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Contact'}
        </Button>
      </div>

      {isAdding && (
        <Card title="Add Care Plan Contact" padded glow>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contact Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Alex or Partner"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role in Care Plan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as NetworkContact['role'])}
                className="w-full rounded-xl border border-edgesoft bg-panelsoft px-3 py-2 text-sm text-slate-200 hw-focus"
              >
                <option value="ally">Support Ally</option>
                <option value="accountability">Accountability Partner</option>
                <option value="professional">Professional / Clinician</option>
                <option value="trusted">Trusted Contact</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contact Info / Method</label>
              <Input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Phone, email, or preferred meetup"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Boundary / Communication Notes</label>
              <textarea
                value={boundaryNotes}
                onChange={(e) => setBoundaryNotes(e.target.value)}
                placeholder="e.g. Contact only for scheduled check-ins or emergency..."
                rows={2}
                className="w-full rounded-xl border border-edgesoft bg-panelsoft p-3 text-sm text-slate-200 hw-focus"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Contact
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {contacts.map((c) => (
          <Card key={c.id} padded className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-200">{c.name}</span>
                <Badge tone={c.activeInCarePlan ? 'win' : 'neutral'}>
                  {roleLabel(c.role)}
                </Badge>
              </div>
              {c.contactInfo && (
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-signal-400 font-mono truncate">📞 {c.contactInfo}</p>
                  <div className="flex shrink-0 gap-1.5">
                    <a
                      href={`tel:${encodeURIComponent(c.contactInfo)}`}
                      className="rounded-lg border border-edgesoft bg-panelsoft px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-signal-500/50"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${encodeURIComponent(c.contactInfo)}`}
                      className="rounded-lg border border-edgesoft bg-panelsoft px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-signal-500/50"
                    >
                      Text
                    </a>
                  </div>
                </div>
              )}
              {c.boundaryNotes && (
                <p className="text-xs text-slate-300 leading-relaxed mb-4">Note: {c.boundaryNotes}</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-edge/50 pt-3">
              <button
                type="button"
                onClick={() => updateContact(c.id, { activeInCarePlan: !c.activeInCarePlan })}
                className="text-xs font-medium text-signal-400 hover:text-signal-300"
              >
                {c.activeInCarePlan ? 'Active in Plan' : 'Paused in Plan'}
              </button>
              <button
                type="button"
                onClick={() => deleteContact(c.id)}
                className="text-xs font-medium text-alarm hover:text-alarm/80"
              >
                Remove
              </button>
            </div>
          </Card>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-edge p-8 text-center text-xs text-slate-500">
            No contacts added to your care network yet. Click "+ Add Contact" above.
          </div>
        )}
      </div>
    </div>
  );
}
