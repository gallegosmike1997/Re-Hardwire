'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input, Toggle } from '@/components/ui/Input';
import { Notice, StatTile } from '@/components/ui/StatTile';

/** Permission keys kept in sync with the backend profile defaults. */
const PERMISSION_KEYS: Array<{ key: string; label: string; description: string }> = [
  { key: 'chat', label: 'Coaching chat', description: 'Talk with the routing engine.' },
  { key: 'tts', label: 'Voice replies', description: 'Render coach replies as audio.' },
  { key: 'voice_input', label: 'Voice input', description: 'Dictate turns with the microphone.' },
  { key: 'history', label: 'Session history', description: 'Store conversations on device.' },
  { key: 'analytics', label: 'Local analytics', description: 'Keep routing statistics locally.' },
];

interface Profile {
  id: string;
  name: string;
  email: string;
  preferences: Record<string, unknown>;
  permissions: string[];
  createdAt: string;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Profile;
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
    } catch {
      setError('Profile service unreachable. Start the backend and retry.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProfile((await res.json()) as Profile);
      setSaved(true);
    } catch {
      setError('Could not save the profile.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (key: string, enabled: boolean) => {
    if (!profile) return;
    const permissions = enabled
      ? [...profile.permissions, key]
      : profile.permissions.filter((item) => item !== key);
    setProfile({ ...profile, permissions });
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (res.ok) setProfile((await res.json()) as Profile);
    } catch {
      setError('Could not sync permissions.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Account</h1>
        <p className="text-sm text-slate-500">
          Who the coach is talking to, and what the app is allowed to do.
        </p>
      </header>

      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Profile saved.</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Profile ID"
          value={profile?.id ?? '---'}
          hint={profile ? `created ${new Date(profile.createdAt).toLocaleDateString()}` : undefined}
          icon="person"
        />
        <StatTile
          label="Permissions granted"
          value={profile ? `${profile.permissions.length} / ${PERMISSION_KEYS.length}` : '---'}
          icon="check"
          tone="win"
        />
      </div>

      <section className="space-y-4 rounded-xl border border-edge/70 bg-panel/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="person" size={16} /> Identity
        </h2>
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Operator"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="operator@re-hardwire.local"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !profile}
          className="inline-flex items-center gap-2 rounded-lg bg-signal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-500 disabled:opacity-50"
        >
          <Icon name="check" size={15} />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="shield" size={16} /> Permissions
        </h2>
        {PERMISSION_KEYS.map((item) => (
          <Toggle
            key={item.key}
            label={item.label}
            description={item.description}
            checked={profile ? profile.permissions.includes(item.key) : false}
            disabled={!profile}
            onChange={(next) => void togglePermission(item.key, next)}
          />
        ))}
      </section>
    </div>
  );
}