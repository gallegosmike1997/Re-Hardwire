'use client';

import { useEffect, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useChatStore } from '@/state/useChatStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useProtocolStore } from '@/state/useProtocolStore';
import { useSystemStore } from '@/state/useSystemStore';
import { ThemeController } from '@/components/settings/ThemeController';
import { useHistoryStore } from '@/state/useHistoryStore';
import { usePracticeStore } from '@/state/usePracticeStore';

function ConnectionBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="border-b border-warmth/20 bg-warmth/5 px-4 py-2 text-center text-xs text-warmth">
      You’re offline. Guided tools and saved on-device content are still available; coach chat needs a connection.
    </div>
  );
}

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
  const hydratePractices = usePracticeStore((state) => state.hydrate);

  const loadProfile = useProfileStore((state) => state.loadProfile);
  const loadCatalog = useProtocolStore((state) => state.loadCatalog);
  const check = useSystemStore((state) => state.check);

  useEffect(() => {
    // Local storage first so the first paint already reflects the saved state.
    hydrateChat();
    hydrateProfile();
    hydrateProtocol();
    hydratePractices();

    void check();
    void loadProfile();
    void loadCatalog();

    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const syncLocalState = () => {
      void useProfileStore.getState().loadProfile();
      void useHistoryStore.getState().refresh();
    };
    window.addEventListener('online', syncLocalState);
    return () => window.removeEventListener('online', syncLocalState);
  }, [check, hydrateChat, hydrateProfile, hydrateProtocol, hydratePractices, loadCatalog, loadProfile]);

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ThemeController />
        <Header />
        <ConnectionBanner />
        <main className="hw-scroll flex-1 overflow-y-auto px-4 pt-6 pb-28 sm:px-6 md:pb-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-up">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
