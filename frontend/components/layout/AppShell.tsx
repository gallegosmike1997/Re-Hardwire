'use client';

import { useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useChatStore } from '@/state/useChatStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useProtocolStore } from '@/state/useProtocolStore';
import { useSystemStore } from '@/state/useSystemStore';
import { ThemeController } from '@/components/settings/ThemeController';

/**
 * Application chrome.
 *
 * Runs the one-time bootstrap (local hydration, then the backend round-trips
 * for health, profile and the protocol catalogue) and lays out the persistent
 * sidebar plus the scrollable content column.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrateChat = useChatStore((state) => state.hydrate);
  const hydrateProfile = useProfileStore((state) => state.hydrate);
  const hydrateProtocol = useProtocolStore((state) => state.hydrate);

  const loadProfile = useProfileStore((state) => state.loadProfile);
  const loadCatalog = useProtocolStore((state) => state.loadCatalog);
  const check = useSystemStore((state) => state.check);

  useEffect(() => {
    // Local storage first so the first paint already reflects the saved state.
    hydrateChat();
    hydrateProfile();
    hydrateProtocol();

    void check();
    void loadProfile();
    void loadCatalog();
  }, [check, hydrateChat, hydrateProfile, hydrateProtocol, loadCatalog, loadProfile]);

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ThemeController />
        <Header />
        <main className="hw-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}