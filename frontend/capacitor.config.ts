import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rehardwire.app',
  appName: 'Re-Hardwire',
  // Matches `next build` with BUILD_TARGET=capacitor (output: 'export').
  webDir: 'out',
  server: {
    // Serve the Capacitor WebView over http (not the https default) so that
    // requests to a cleartext http:// dev backend are not treated as mixed
    // content and blocked by Chromium. `http://localhost` is still a W3C
    // "potentially trustworthy" origin, so it remains a secure context
    // (crypto.subtle, service workers). In production the app is offline-first
    // with no backend base URL, so the scheme makes no functional difference.
    androidScheme: 'http',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#05070aff',
      showSpinner: false,
    },
  },
};

export default config;
