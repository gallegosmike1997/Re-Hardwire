'use client';

import { useEffect } from 'react';
import { useRelationshipStore } from '@/state/useRelationshipStore';
import { BoundaryManager } from '@/components/boundaries/BoundaryManager';
import { CarePlanNetworkTracker } from '@/components/boundaries/CarePlanNetworkTracker';
import { StatTile } from '@/components/ui/StatTile';

export default function BoundariesAndNetworkPage() {
  const hydrate = useRelationshipStore((s) => s.hydrate);
  const boundaries = useRelationshipStore((s) => s.boundaries);
  const contacts = useRelationshipStore((s) => s.contacts);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const activeBoundaries = boundaries.filter((b) => b.active).length;
  const activeContacts = contacts.filter((c) => c.activeInCarePlan).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
      <header className="space-y-2">
        <p className="hw-label">Boundaries &amp; Care Network</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          Relationships &amp; Support Plan Tracking
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Establish healthy relationship boundaries and track the allies, accountability partners, and professionals involved in your self-created care plan.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Active Boundaries"
          value={`${activeBoundaries} / ${boundaries.length}`}
          icon="shield"
          tone="signal"
        />
        <StatTile
          label="Care Network Contacts"
          value={`${activeContacts} / ${contacts.length}`}
          icon="person"
          tone="win"
        />
      </div>

      <section className="space-y-6">
        <BoundaryManager />
      </section>

      <hr className="border-edge" />

      <section className="space-y-6">
        <CarePlanNetworkTracker />
      </section>
    </div>
  );
}
