'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProfileStore } from '@/state/useProfileStore';
import { Card, Notice, StatTile, Toggle } from '@/components/ui';
import { ThemeController } from '@/components/settings/ThemeController';
import { OfflineReadinessCard } from '@/components/offline/OfflineReadinessCard';
import {
  chooseSpeechVoice,
  getSpeechLanguage,
  getSpeechRate,
  SYSTEM_SPEECH_LANGUAGE,
} from '@/lib/speech';
import {
  createEncryptedBackup,
  MAX_ENCRYPTED_BACKUP_BYTES,
  restoreEncryptedBackup,
} from '@/lib/encryptedBackup';

const SPEECH_PREVIEWS: Record<string, string> = {
  de: 'Ich höre dir zu. Wir können einen Schritt nach dem anderen gehen.',
  en: 'I hear you. We can take this one step at a time.',
  es: 'Te escucho. Podemos ir paso a paso.',
  fr: 'Je vous écoute. Nous pouvons avancer étape par étape.',
  it: 'Ti ascolto. Possiamo fare un passo alla volta.',
  ja: '話を聞いています。一歩ずつ進めましょう。',
  pt: 'Estou ouvindo. Podemos avançar um passo de cada vez.',
};

function exportLocalData() {
  const data: Record<string, unknown> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('re-hardwire-')) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw) as { data?: unknown };
      data[key] = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
    } catch {
      data[key] = raw;
    }
  }

  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `re-hardwire-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function clearLocalData() {
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith('re-hardwire-')));
  keys.forEach((key) => localStorage.removeItem(key));
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.allSettled(cacheKeys
        .filter((key) => key.startsWith('re-hardwire-'))
        .map((key) => caches.delete(key)));
    }
  } catch {
    // Local storage has already been cleared; reload even if Cache Storage is unavailable.
  } finally {
    window.location.reload();
  }
}

function speechLanguageLabel(language: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}

/**
 * Preferences are saved locally first; a configured backend can sync them.
 */
export default function SettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const isSaving = useProfileStore((state) => state.isSaving);
  const error = useProfileStore((state) => state.error);
  const prefs = profile?.preferences ?? {};
  const permissions = profile?.permissions ?? [];

  const updateProfile = useProfileStore((state) => state.updateProfile);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const ui = useProfileStore((state) => state.ui);
  const updateUi = useProfileStore((state) => state.updateUi);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPreviewingSpeech, setIsPreviewingSpeech] = useState(false);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirmation, setBackupConfirmation] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupStatus, setBackupStatus] = useState('');

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const refreshVoices = () => setSpeechVoices(window.speechSynthesis.getVoices());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speechLanguages = useMemo(
    () => [...new Set(speechVoices.map((voice) => voice.lang).filter(Boolean))].sort(),
    [speechVoices],
  );
  const selectedSpeechLanguage = typeof prefs.ttsLanguage === 'string'
    ? prefs.ttsLanguage
    : typeof prefs.voiceLanguage === 'string' ? prefs.voiceLanguage : SYSTEM_SPEECH_LANGUAGE;
  const preferredSpeechVoice = typeof prefs.ttsVoice === 'string'
    ? prefs.ttsVoice
    : typeof prefs.voiceName === 'string' ? prefs.voiceName : '';
  const availableSpeechVoices = selectedSpeechLanguage === SYSTEM_SPEECH_LANGUAGE
    ? speechVoices
    : speechVoices.filter((voice) => voice.lang === selectedSpeechLanguage);
  const selectedSpeechVoice = availableSpeechVoices.some((voice) => voice.voiceURI === preferredSpeechVoice)
    ? preferredSpeechVoice : '';
  const selectedSpeechRate = getSpeechRate(prefs.ttsRate);

  const updateSpeechPreferences = (voiceLanguage: string, voiceName: string) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPreviewingSpeech(false);
    void updateProfile({ preferences: { ...prefs, ttsLanguage: voiceLanguage, ttsVoice: voiceName } });
  };

  const previewSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPreviewingSpeech) {
      window.speechSynthesis.cancel();
      setIsPreviewingSpeech(false);
      return;
    }

    const language = getSpeechLanguage(selectedSpeechLanguage, navigator.language);
    const utterance = new SpeechSynthesisUtterance(
      SPEECH_PREVIEWS[language.split('-')[0]] ?? 'This is a voice preview. We can take things one step at a time.',
    );
    utterance.lang = language;
    utterance.voice = chooseSpeechVoice(
      speechVoices,
      language,
      selectedSpeechVoice || undefined,
    ) ?? null;
    utterance.rate = selectedSpeechRate;
    utterance.onend = () => setIsPreviewingSpeech(false);
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setIsPreviewingSpeech(false);
      }
    };
    window.speechSynthesis.cancel();
    setIsPreviewingSpeech(true);
    window.speechSynthesis.speak(utterance);
  };

  const exportEncryptedBackup = async () => {
    if (backupPassphrase.length < 12) {
      setBackupStatus('Use a passphrase with at least 12 characters.');
      return;
    }
    if (backupPassphrase !== backupConfirmation) {
      setBackupStatus('The passphrases do not match.');
      return;
    }
    try {
      const backup = await createEncryptedBackup(backupPassphrase);
      const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `re-hardwire-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupStatus('Encrypted backup downloaded. Keep the passphrase somewhere safe; it cannot be recovered.');
      setBackupPassphrase('');
      setBackupConfirmation('');
    } catch (cause) {
      setBackupStatus(cause instanceof Error ? cause.message : 'Could not create the encrypted backup.');
    }
  };

  const importEncryptedBackup = async () => {
    if (!backupFile || !backupPassphrase) {
      setBackupStatus('Choose a backup file and enter its passphrase.');
      return;
    }
    if (backupFile.size > MAX_ENCRYPTED_BACKUP_BYTES) {
      setBackupStatus('This backup exceeds the 50 MB size limit.');
      return;
    }
    if (!window.confirm('Restore this backup? It will replace the Re-Hardwire data currently saved in this browser.')) return;
    try {
      const count = await restoreEncryptedBackup(await backupFile.text(), backupPassphrase);
      setBackupStatus(`Restored ${count} local data entries. Reloading…`);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (cause) {
      setBackupStatus(cause instanceof Error ? cause.message : 'Could not restore this backup.');
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const setPref = (key: string, value: unknown) => {
    void updateProfile({ preferences: { ...prefs, [key]: value } });
  };

  const togglePermission = (key: string, enabled: boolean) => {
    const next = enabled ? [...permissions, key] : permissions.filter((item) => item !== key);
    void updateProfile({ permissions: next });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="hw-label">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          App preferences
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-slate-500">
          Your choices are saved on this device. A configured backend can sync account preferences when available.
        </p>
      </header>

      {error && <Notice tone="warn">{error}</Notice>}
      {isSaving && <Notice tone="info">Saving…</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        <ThemeController controls />
        <StatTile label="Permissions" value={`${permissions.length} granted`} icon="shield" tone="win" />
      </div>

      <Card title="Device preferences" subtitle="Available offline on this device.">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-edge/70 bg-panelsoft/50 px-3 py-2.5">
            <span className="text-sm text-slate-200">Text size</span>
            <select
              aria-label="Text size"
              className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-xs text-slate-200"
              value={ui.textSize}
              onChange={(event) => updateUi({ textSize: event.target.value as 'regular' | 'large' | 'largest' })}
            >
              <option value="regular">Regular</option>
              <option value="large">Large</option>
              <option value="largest">Largest</option>
            </select>
          </label>
          <Toggle
            label="Reply speech playback"
            description="Enable the Speak control beneath coach replies."
            checked={Boolean(prefs.ttsEnabled)}
            onChange={(next) => setPref('ttsEnabled', next)}
            disabled={isSaving || !profile}
          />
          <div className="space-y-2 rounded-lg border border-edge/70 bg-panelsoft/50 px-3 py-3">
            <p className="text-sm font-medium text-slate-200">Speech voice</p>
            <p className="text-xs leading-relaxed text-slate-500">
              Choose a dialect and voice available to your browser. Voice quality depends on your browser or operating system; some voices may use its online speech service.
            </p>
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
              Accent / dialect
              <select
                aria-label="Speech accent or dialect"
                className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-sm text-slate-200"
                value={selectedSpeechLanguage}
                onChange={(event) => updateSpeechPreferences(event.target.value, '')}
                disabled={isSaving || !profile || speechVoices.length === 0}
              >
                <option value={SYSTEM_SPEECH_LANGUAGE}>System default</option>
                {speechLanguages.map((language) => {
                  return <option key={language} value={language}>{speechLanguageLabel(language)} ({language})</option>;
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
              Voice
              <select
                aria-label="Speech voice"
                className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-sm text-slate-200"
                value={selectedSpeechVoice}
                onChange={(event) => {
                  const voice = availableSpeechVoices.find((item) => item.voiceURI === event.target.value);
                  const language = selectedSpeechLanguage === SYSTEM_SPEECH_LANGUAGE && voice
                    ? voice.lang : selectedSpeechLanguage;
                  updateSpeechPreferences(language, event.target.value);
                }}
                disabled={isSaving || !profile || availableSpeechVoices.length === 0}
              >
                <option value="">Automatic</option>
                {availableSpeechVoices.map((voice) => (
                  <option key={`${voice.voiceURI}-${voice.lang}`} value={voice.voiceURI}>
                    {voice.name} ({voice.lang}){voice.localService ? '' : ' · online'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
              Speaking pace
              <select
                aria-label="Speaking pace"
                className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-sm text-slate-200"
                value={String(selectedSpeechRate)}
                onChange={(event) => setPref('ttsRate', Number(event.target.value))}
                disabled={isSaving || !profile}
              >
                <option value="0.85">Gentle</option>
                <option value="0.95">Relaxed</option>
                <option value="1">Natural</option>
                <option value="1.1">Brisk</option>
              </select>
            </label>
            <button
              type="button"
              onClick={previewSpeech}
              aria-pressed={isPreviewingSpeech}
              disabled={!profile || isSaving || speechVoices.length === 0}
              className="hw-focus rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-sm text-signal-300 hover:bg-signal-500/15 disabled:opacity-50"
            >
              {isPreviewingSpeech ? 'Stop preview' : 'Preview voice'}
            </button>
            {speechVoices.length === 0 && (
              <p className="text-xs text-slate-500">No browser voices are available yet. Check your device speech settings or try again after voices load.</p>
            )}
          </div>
          <Toggle
            label="Voice input"
            description="Dictate coach turns with your microphone."
            checked={Boolean(prefs.voiceInput)}
            onChange={(next) => setPref('voiceInput', next)}
            disabled={isSaving || !profile}
          />
          <Toggle
            label="Analytics"
            description="Keep local routing statistics on this device."
            checked={Boolean(prefs.analyticsEnabled)}
            onChange={(next) => setPref('analyticsEnabled', next)}
            disabled={isSaving || !profile}
          />
          <Toggle
            label="Reduce motion"
            description="Disable animations across the app."
            checked={ui.reducedMotion}
            onChange={(next) => updateUi({ reducedMotion: next })}
          />
          <Toggle
            label="Quiet sensory mode"
            description="Remove ambient background effects, card lift, and decorative shadows."
            checked={ui.quietMode}
            onChange={(next) => updateUi({ quietMode: next })}
          />
          <Toggle
            label="Routing signals"
            description="Show protocol chips under coach replies."
            checked={ui.showSignals}
            onChange={(next) => updateUi({ showSignals: next })}
          />
        </div>
      </Card>

      <Card title="Capabilities" subtitle="On-device switches for optional features.">
        <div className="space-y-2">
          {['chat', 'tts', 'voice_input', 'analytics', 'history'].map((key) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-edgesoft bg-panelsoft/40 px-3 py-2.5">
              <span className="text-sm text-slate-300">{key}</span>
                            <Toggle
                label={key}
                checked={permissions.includes(key)}
                onChange={(enabled) => togglePermission(key, enabled)}
                disabled={isSaving || !profile}
              />
            </div>
          ))}
        </div>
      </Card>

      <OfflineReadinessCard />

      <Card title="Conversation review and sharing" subtitle="Clinical review is off for every conversation.">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-edge/70 bg-panelsoft/40 p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">On this device</span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">Profile, preferences, support plan, and saved local chats use browser storage. They are not encrypted.</p>
          </div>
          <div className="rounded-xl border border-warmth/20 bg-warmth/5 p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warmth">Online coach</span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">Each message is sent to the configured chat service when you request a reply. Temporary chat does not change this.</p>
          </div>
          <div className="rounded-xl border border-win/20 bg-win/5 p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-win">Clinical review</span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">Off. No clinician receives conversations or personal data through this app.</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
          Independent review of the practice adaptations is also pending. No national clinical approval or endorsement is claimed.
        </p>
      </Card>

      <Card title="Privacy and local data" subtitle="Export or clear data saved in this browser profile.">
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Local entries are stored by your browser on this device. Re-Hardwire does not encrypt active app data. Use Temporary chat to keep an open conversation in memory only. Clearing local data does not remove information already sent to a configured backend or files you downloaded.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('This export is readable JSON and is not encrypted. Continue? For an encrypted file, use Encrypted backup below.')) exportLocalData();
            }}
            className="hw-focus rounded-lg border border-edgesoft px-3 py-2 text-sm text-slate-200 hover:bg-panelsoft"
          >
            Export readable JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all Re-Hardwire data and offline app files saved in this browser profile? This cannot be undone. It will not delete data already sent to a backend or files you downloaded.')) void clearLocalData();
            }}
            className="hw-focus rounded-lg border border-alarm/35 bg-alarm/5 px-3 py-2 text-sm text-alarm hover:bg-alarm/10"
          >
            Clear local data
          </button>
        </div>
        <div className="mt-5 space-y-3 border-t border-edge pt-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Encrypted backup</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Protect a portable backup with a passphrase. This encrypts the downloaded file; active app data remains in browser storage. Re-Hardwire cannot recover a lost passphrase.
            </p>
          </div>
          <label className="block text-xs text-slate-400">
            Backup passphrase
            <input
              type="password"
              autoComplete="new-password"
              value={backupPassphrase}
              onChange={(event) => setBackupPassphrase(event.target.value)}
              className="hw-focus mt-1.5 w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Confirm passphrase for export
            <input
              type="password"
              autoComplete="new-password"
              value={backupConfirmation}
              onChange={(event) => setBackupConfirmation(event.target.value)}
              className="hw-focus mt-1.5 w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Backup file to restore
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)}
              className="hw-focus mt-1.5 block w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-panelsoft file:px-3 file:py-1.5 file:text-xs file:text-slate-200"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportEncryptedBackup()}
              className="hw-focus rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-sm text-signal-300 hover:bg-signal-500/15"
            >
              Export encrypted backup
            </button>
            <button
              type="button"
              onClick={() => void importEncryptedBackup()}
              disabled={!backupFile || !backupPassphrase}
              className="hw-focus rounded-lg border border-edgesoft px-3 py-2 text-sm text-slate-200 hover:bg-panelsoft disabled:opacity-50"
            >
              Restore backup
            </button>
          </div>
          {backupStatus && <p role="status" className="text-xs text-slate-400">{backupStatus}</p>}
        </div>
      </Card>

      <Card title="Danger zone" subtitle="Actions that reset local state.">
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Reset the profile to defaults?')) return;
            await resetProfile();
          }}
          disabled={isLoading || !profile}
          className="inline-flex items-center gap-2 rounded-lg border border-alarm/35 bg-alarm/5 px-4 py-2 text-sm font-medium text-alarm hover:bg-alarm/10 disabled:opacity-50"
        >
          <span role="img" aria-label="reset">
            ↻
          </span>
          Reset profile
        </button>
      </Card>
    </div>
  );
}
