'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input, Toggle } from '@/components/ui/Input';
import { Notice, StatTile } from '@/components/ui/StatTile';
import { useProfileStore } from '@/state/useProfileStore';

const PERMISSIONS = [
  { key: 'chat', label: 'Coaching chat', description: 'Talk with the configured coaching service.' },
  { key: 'tts', label: 'Voice replies', description: 'Read replies aloud with device speech.' },
  { key: 'voice_input', label: 'Voice input', description: 'Dictate turns when your device supports it.' },
  { key: 'history', label: 'Session history', description: 'Keep saved conversations on this device.' },
  { key: 'analytics', label: 'Local analytics', description: 'Keep routing statistics on this device.' },
];

export default function AccountPage() {
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const isSaving = useProfileStore((state) => state.isSaving);
  const error = useProfileStore((state) => state.error);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const profileName = profile?.name;
  const profileEmail = profile?.email;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // The editable form mirrors profile data after the client store loads it.
  useEffect(() => {
    if (profileName === undefined || profileEmail === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(profileName);
    setEmail(profileEmail);
  }, [profileName, profileEmail]);

  const save = async () => {
    setSaved(false);
    await updateProfile({ name, email });
    setSaved(true);
  };

  const togglePermission = async (key: string, enabled: boolean) => {
    if (!profile) return;
    const permissions = enabled
      ? [...profile.permissions, key]
      : profile.permissions.filter((item) => item !== key);
    await updateProfile({ permissions });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Account</h1>
        <p className="text-sm text-slate-500">Your profile and optional capabilities are saved on this device.</p>
      </header>

      {error && <Notice tone="warn">{error}</Notice>}
      {saved && <Notice tone="success">Profile saved on this device.</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Profile ID"
          value={profile?.id ?? '---'}
          hint={profile ? `created ${new Date(profile.createdAt).toLocaleDateString()}` : undefined}
          icon="person"
        />
        <StatTile
          label="Permissions granted"
          value={profile ? `${profile.permissions.length} / ${PERMISSIONS.length}` : '---'}
          icon="check"
          tone="win"
        />
      </div>

      <section className="space-y-4 rounded-xl border border-edge/70 bg-panel/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="person" size={16} /> Identity
        </h2>
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="You" />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional" />
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving || !profile}
          className="inline-flex items-center gap-2 rounded-lg bg-signal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-500 disabled:opacity-50"
        >
          <Icon name="check" size={15} />
          {isSaving ? 'Saving…' : 'Save profile'}
        </button>
        {isLoading && <p className="text-xs text-slate-500">Checking for a synced profile…</p>}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="shield" size={16} /> Optional capabilities
        </h2>
        {PERMISSIONS.map((item) => (
          <Toggle
            key={item.key}
            label={item.label}
            description={item.description}
            checked={profile?.permissions.includes(item.key) ?? false}
            disabled={isSaving || !profile}
            onChange={(next) => void togglePermission(item.key, next)}
          />
        ))}
      </section>
    </div>
  );
}
