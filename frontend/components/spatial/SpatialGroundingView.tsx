'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SPATIAL_ENVIRONMENTS, isWebXrSupported, type SpatialEnvironment } from '@/lib/spatialGrounding';

export function SpatialGroundingView() {
  const [selectedEnv, setSelectedEnv] = useState<SpatialEnvironment>(SPATIAL_ENVIRONMENTS[0]);
  const [active, setActive] = useState(false);
  const xrSupported = isWebXrSupported();

  return (
    <Card
      title="Spatial 3D Grounding Environments"
      subtitle="Immersive audio-visual breathing spaces for headsets, glasses, and display surfaces."
      glow
      padded
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={xrSupported ? 'win' : 'signal'}>
            {xrSupported ? 'WebXR Hardware Ready' : '3D Spatial Canvas Mode'}
          </Badge>
          <span className="font-mono text-[10px] text-slate-500">Frequency: {selectedEnv.ambientFrequencyHz} Hz</span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {SPATIAL_ENVIRONMENTS.map((env) => (
            <button
              key={env.id}
              type="button"
              onClick={() => {
                setSelectedEnv(env);
                setActive(false);
              }}
              className={[
                'hw-focus flex flex-col justify-between rounded-xl border p-3 text-left transition-all',
                selectedEnv.id === env.id
                  ? 'border-signal-500/60 bg-signal-500/10 text-slate-100'
                  : 'border-edgesoft bg-panelsoft/40 text-slate-300 hover:border-signal-500/30',
              ].join(' ')}
            >
              <div>
                <p className="text-xs font-semibold">{env.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{env.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className={['relative overflow-hidden rounded-2xl border border-white/10 p-6 text-center bg-gradient-to-br transition-all duration-500', selectedEnv.bgGradient].join(' ')}>
          <div className="mx-auto max-w-sm space-y-3">
            <div className="flex justify-center">
              <span className={['flex h-16 w-16 items-center justify-center rounded-full border border-signal-400/30 bg-signal-500/10 text-signal-300 shadow-glow', active ? 'animate-pulse' : ''].join(' ')}>
                <Icon name="activity" size={32} />
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100">{selectedEnv.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {active ? 'Spatial audio pacing active. Inhale as the circle expands, exhale as it contracts.' : 'Select an environment and start spatial grounding.'}
            </p>
            <div className="pt-2">
              <Button
                variant={active ? 'secondary' : 'primary'}
                size="md"
                onClick={() => setActive(!active)}
              >
                {active ? 'Pause Session' : 'Begin Spatial Session'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
