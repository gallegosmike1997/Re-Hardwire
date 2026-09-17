import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rehardwire.app',
  appName: 'Re-Hardwire',
  // Matches `next build` with BUILD_TARGET=capacitor (output: 'export').
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
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