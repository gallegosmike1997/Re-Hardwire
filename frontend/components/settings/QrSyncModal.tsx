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
  const [payloadText, setPayloadText] = useState('');
  const [importCode, setImportCode] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  if (!mode) return null;

  const handleCreate = async () => {
    if (passphrase.length < 12) {
      onError('Use a passphrase with at least 12 characters.');
      return;
    }
    setIsWorking(true);
    try {
      setPayloadText(await createSyncPayload(passphrase));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not create an encrypted sync payload.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!payloadText) return;
    await navigator.clipboard?.writeText(payloadText);
    onSuccess('Sync payload copied to clipboard.');
  };

  const handleImport = async () => {
    if (!importCode.trim()) {
      onError('Please paste a valid sync payload code.');
      return;
    }
    if (passphrase.length < 12) {
      onError('Enter the passphrase used to create this sync payload.');
      return;
    }
    setIsWorking(true);
    try {
      const restored = await restoreSyncPayload(importCode.trim(), passphrase);
      onSuccess(restored.legacyUnencrypted
        ? `Restored ${restored.count} items from a legacy payload that was not encrypted. Reloading…`
        : `Restored ${restored.count} encrypted items. Reloading…`);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not restore the encrypted sync payload.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <Card
          title={mode === 'export' ? 'Encrypted device transfer' : 'Restore encrypted transfer'}
          subtitle={mode === 'export' ? 'Create a passphrase-protected payload to move profile data between devices.' : 'Paste a payload and enter the passphrase used to encrypt it.'}
          glow
          padded
        >
          <div className="space-y-4">
            {mode === 'export' ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-300">
                  Use the same passphrase on both devices. Keep it separate from the payload.
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  aria-label="Sync passphrase"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  minLength={12}
                  placeholder="Passphrase (12+ characters)"
                  className="hw-focus w-full rounded-lg border border-edgesoft bg-void/70 px-3 py-2 text-sm text-slate-200"
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => void handleCreate()} loading={isWorking}>
                  Create encrypted payload
                </Button>
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
                  <Button type="button" variant="primary" size="sm" onClick={() => void handleCopy()} disabled={!payloadText}>
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
                <input
                  type="password"
                  autoComplete="current-password"
                  aria-label="Sync passphrase"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  placeholder="Passphrase"
                  className="hw-focus w-full rounded-lg border border-edgesoft bg-void/70 px-3 py-2 text-sm text-slate-200"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={() => void handleImport()} loading={isWorking}>
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
