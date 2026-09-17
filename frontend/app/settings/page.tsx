'use client';

import { useEffect } from 'react';
import { useProfileStore } from '@/state/useProfileStore';
import { Card, Notice, StatTile, Toggle } from '@/components/ui';

/**
 * Preferences that live in the user profile on the backend and are mirrored to
 * localStorage for offline reads.
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
          Backend preferences sync to your profile. Interface preferences stay on
          this device.
        </p>
      </header>

      {error && <Notice tone="warn">{error}</Notice>}
      {isSaving && <Notice tone="info">Saving…</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
                <StatTile label="Theme" value={((prefs.theme as string) ?? 'dark')} icon="code" />
        <StatTile label="Permissions" value={`${permissions.length} granted`} icon="shield" tone="win" />
      </div>

      <Card title="Backend preferences" subtitle="Tied to your profile, synced by the backend.">
        <div className="space-y-3">
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
        </div>
      </Card>

      <Card title="Capabilities" subtitle="Fine-grained switches stored with the profile.">
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

      <Card title="Danger zone" subtitle="Actions that reset local state.">
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Reset the profile to defaults?')) return;
            const response = await fetch('/api/profile/reset', { method: 'POST' });
            if (!response.ok) {
              // error surfaced through the store on next load
            }
            void loadProfile();
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