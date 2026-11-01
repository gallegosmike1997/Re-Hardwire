'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createSyncPayload, restoreSyncPayload } from '@/lib/qrSync';

interface QrSyncModalProps {
  mode: 'export' | 'import' | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function QrSyncModal({ mode, onClose, onSuccess, onError }: QrSyncModalProps) {
  const [payloadText, setPayloadText] = useState(() => (mode === 'export' ? createSyncPayload() : ''));
  const [importCode, setImportCode] = useState('');

  if (!mode) return null;

  const handleCopy = () => {
    if (!payloadText) return;
    navigator.clipboard?.writeText(payloadText);
    onSuccess('Sync payload copied to clipboard.');
  };

  const handleImport = () => {
    if (!importCode.trim()) {
      onError('Please paste a valid sync payload code.');
      return;
    }
    const success = restoreSyncPayload(importCode.trim());
    if (success) {
      onSuccess('Successfully restored data from sync payload. Reloading…');
      window.setTimeout(() => window.location.reload(), 600);
    } else {
      onError('Could not restore from sync payload. Invalid or corrupted code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <Card
          title={mode === 'export' ? 'Air-Gapped QR Sync Export' : 'Restore from Sync Code'}
          subtitle={mode === 'export' ? 'Transfer your encrypted backup payload directly between devices.' : 'Paste your sync code to restore your support plan and care network.'}
          glow
          padded
        >
          <div className="space-y-4">
            {mode === 'export' ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-300">
                  Copy this secure sync payload or encode it into a QR code for your other device:
                </p>
                <textarea
                  readOnly
                  value={payloadText}
                  rows={4}
                  className="w-full rounded-xl border border-edgesoft bg-void/70 p-3 font-mono text-[11px] text-signal-300 select-all hw-focus"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={handleCopy}>
                    Copy to Clipboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-300">
                  Paste the sync payload code below to restore your settings, support plan, and care network:
                </p>
                <textarea
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="Paste payload code here..."
                  rows={4}
                  className="w-full rounded-xl border border-edgesoft bg-void/70 p-3 font-mono text-[11px] text-slate-200 hw-focus"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={handleImport}>
                    Restore Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
