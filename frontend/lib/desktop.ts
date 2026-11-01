/**
 * Cross-Platform Desktop Support (Week 64)
 * Tauri/Electron integration for Windows/macOS desktop experience.
 *
 * Week 64: Initial desktop integration framework.
 * Goal: Enable Re-Hardwire to run as a desktop application on Windows and macOS,
 * maintaining offline-first principles and all existing features.
 */

 /** Desktop application configuration. */
export interface DesktopConfig {
  /** Operating system platform. */
  platform: 'windows' | 'macos' | 'linux';
  /** Whether the app is running in a packaged desktop environment. */
  isPackaged: boolean;
  /** Enable auto-update checks. */
  enableUpdates: boolean;
  /** Custom user data path. */
  userDataPath?: string;
}

/** Check if running as a packaged desktop app. */
function isPackagedApp(): boolean {
  // In production, this would check for Tauri/Electron contexts
  // For now, check environment indicators
  const hasProcess = typeof process !== 'undefined';
  const isTauri = hasProcess && process.type === 'internal'; // Simplified check
  const isElectron = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  return isTauri || isElectron;
}

/** Get the operating system platform. */
function getPlatform(): 'windows' | 'macos' | 'linux' {
  if (typeof process === 'undefined') return 'linux'; // Default fallback
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return 'linux';
}

/** Initialize desktop-specific features. */
function initDesktop(): void {
  const platform = getPlatform();
  const packaged = isPackagedApp();

  // Set up platform-specific behaviors
  // - Taskbar integration (Windows)
  // - Dock/menu (macOS)
  // - Global shortcuts
  // - File handling
  // - Auto-update configuration

  // Example: Register custom protocol for deep linking
  // Example: Set up global hotkeys
  // Example: Configure save/open file dialogs

  console.log(`Desktop initialized: platform=${platform}, packaged=${packaged}`);
}

/** Exported initialization function. */
export function initializeDesktop(): void {
  if (typeof window === 'undefined') return;
  if (isPackagedApp()) {
    initDesktop();
  }
}

/** Platform-specific window title. */
function getWindowTitle(baseTitle: string): string {
  const platform = getPlatform();
  const packaged = isPackagedApp();
  const suffix = packaged ? ` | Re-Hardwire ${import.meta.env.VITE_APP_VERSION || '1.0'}` : '';
  return `${baseTitle} ${suffix}`;
}

/** Platform-specific about text. */
function getAboutText(): string {
  const platform = getPlatform();
  const packaged = isPackagedApp();
  const year = new Date().getFullYear();
  return `Re-Hardwire ${year} - Digital Self-Help Companion${packaged ? ' (Desktop Edition)' : ''}
Platform: ${platform}
Offline-first, privacy-respecting, clinically-informed guidance.
`;
}

/** Exported utilities */
export { isPackagedApp, getPlatform, initDesktop, getWindowTitle, getAboutText };