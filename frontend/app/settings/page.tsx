'use client';

import { useEffect } from 'react';
import { useProfileStore } from '@/state/useProfileStore';
import { Card, Notice, StatTile, Toggle } from '@/components/ui';
import { ThemeController } from '@/components/settings/ThemeController';

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
  URL.revokeObjectURL(url);
}

function clearLocalData() {
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith('re-hardwire-')));
  keys.forEach((key) => localStorage.removeItem(key));
  window.location.reload();
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
            label="TTS responses"
            description="Let the coach read replies out loud."
            checked={Boolean(prefs.ttsEnabled)}
            onChange={(next) => setPref('ttsEnabled', next)}
            disabled={isSaving || !profile}
          />
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

      <Card title="Privacy and local data" subtitle="Export or clear data saved in this browser profile.">
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Local entries are stored by your browser on this device. Re-Hardwire does not encrypt them. Clearing local data does not remove information already sent to a configured backend.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportLocalData}
            className="hw-focus rounded-lg border border-edgesoft px-3 py-2 text-sm text-slate-200 hover:bg-panelsoft"
          >
            Export my local data
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all Re-Hardwire data saved in this browser profile? This cannot be undone. It will not delete data already sent to a backend.')) clearLocalData();
            }}
            className="hw-focus rounded-lg border border-alarm/35 bg-alarm/5 px-3 py-2 text-sm text-alarm hover:bg-alarm/10"
          >
            Clear local data
          </button>
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
