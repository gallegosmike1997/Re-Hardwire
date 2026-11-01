'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { parseEegPacket, type EegReading } from '@/lib/neuroTechEeg';
import { evaluateClosedLoopBiofeedback } from '@/lib/closedLoopBiofeedback';

export function NeuroFeedbackCard() {
  const [eeg, setEeg] = useState<EegReading | null>(null);

  const handleSimulateEeg = () => {
    const alpha = Math.random() * 8 + 4;
    const theta = Math.random() * 5 + 2;
    setEeg(parseEegPacket(alpha, theta));
  };

  const decision = eeg
    ? evaluateClosedLoopBiofeedback(35, 3.8, eeg.relaxationDepthPercent)
    : null;

  return (
    <Card
      title="Neuro-Feedback &amp; Closed-Loop Biofeedback"
      subtitle="Alpha/Theta brainwave spectral ratio and automated protocol calibration."
      glow
      padded
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge tone={eeg ? 'win' : 'signal'}>
            {eeg ? 'EEG Brainwave Connected' : 'Muse / OpenBCI Ready'}
          </Badge>
          <Button size="sm" onClick={handleSimulateEeg}>
            {eeg ? 'Re-sample EEG' : 'Connect EEG Sensor'}
          </Button>
        </div>

        {eeg && decision && (
          <div className="space-y-3 rounded-xl border border-edgesoft bg-panelsoft/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Relaxation Depth Score</p>
                <p className="text-xl font-bold text-signal-300">{eeg.relaxationDepthPercent}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Alpha / Theta Ratio</p>
                <p className="font-mono text-sm text-slate-200">{eeg.alphaThetaRatio.toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t border-edgesoft pt-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Closed-Loop Recommendation:</p>
              <p className="mt-0.5">Protocol: <strong className="text-signal-300">{decision.protocolName}</strong></p>
              <p className="text-[11px] text-slate-400 mt-1">{decision.reason}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
