'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import {
  classifyAutonomicState,
  isBluetoothSupported,
  type HrvReading,
} from '@/lib/biofeedbackHrv';

export function HrvMonitorCard() {
  const [reading, setReading] = useState<HrvReading | null>(null);
  const [connecting, setConnecting] = useState(false);
  const btSupported = isBluetoothSupported();

  const handleSimulatedConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      const rmssd = Math.floor(Math.random() * 50) + 15;
      const state = classifyAutonomicState(rmssd);
      setReading({
        heartRateBpm: Math.floor(Math.random() * 20) + 65,
        rmssdMs: rmssd,
        autonomicState: state,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 1200);
  };

  const stateTone = (st: HrvReading['autonomicState']) => {
    switch (st) {
      case 'calm': return 'win';
      case 'balanced': return 'signal';
      case 'activated': return 'warmth';
      case 'high_stress': return 'alarm';
    }
  };

  return (
    <Card
      title="Wearable HRV & Biofeedback Monitor"
      subtitle="Real-time Heart Rate Variability (RMSSD) and autonomic state tracking."
      glow
      padded
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={btSupported ? 'win' : 'signal'}>
            {btSupported ? 'Bluetooth LE Ready' : 'Simulated Sensor Mode'}
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            loading={connecting}
            onClick={handleSimulatedConnect}
          >
            {reading ? 'Re-scan Sensor' : 'Connect HR / HRV Sensor'}
          </Button>
        </div>

        {reading ? (
          <div className="space-y-3 rounded-xl border border-edgesoft bg-panelsoft/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Autonomic Nervous System Read</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={stateTone(reading.autonomicState)}>
                    {reading.autonomicState.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="font-mono text-xs text-slate-300">
                    HR: {reading.heartRateBpm} BPM • HRV: {reading.rmssdMs} ms RMSSD
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-slate-500">{reading.timestamp}</span>
            </div>

            {reading.autonomicState === 'high_stress' && (
              <div className="rounded-lg border border-alarm/30 bg-alarm/10 p-3 text-xs text-alarm">
                <p className="font-semibold">High Autonomic Tension Detected</p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Automated Trigger: Recommended protocol switched to <strong>Stabilise &amp; Breathe</strong>.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-edge p-6 text-center text-xs text-slate-500">
            No Bluetooth heart rate sensor connected. Click &quot;Connect HR / HRV Sensor&quot; above to pair your device.
          </div>
        )}
      </div>
    </Card>
  );
}
