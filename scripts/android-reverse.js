#!/usr/bin/env node
/**
 * Forward a connected Android device/emulator's loopback to this machine.
 *
 * The Capacitor WebView (served from http://localhost) cannot reach the host
 * backend at the private alias http://10.0.2.2:8000: Chromium's Local Network
 * Access protection blocks requests to private IPs from the WebView
 * (net::ERR_LOCAL_NETWORK_PERMISSION_MISSING). `adb reverse` makes the device's
 * own localhost:8000 tunnel to this machine's localhost:8000, which is loopback
 * on both ends and therefore not blocked -- and it works for the emulator and a
 * physical device over USB alike.
 *
 * Run the local backend first (`npm run dev`, or the backend on :8000), then:
 *
 *   npm run android:link
 *
 * The tunnel lives only until the device is unplugged or rebooted, so re-run it
 * whenever you reconnect. Debug-only; the release APK makes no dev-backend calls.
 */
const { spawnSync } = require('node:child_process');

const sdk = process.env.ANDROID_HOME
  || process.env.ANDROID_SDK_ROOT
  || `${process.env.LOCALAPPDATA || ''}\\Android\\Sdk`;
const adbCandidates = [
  process.env.ADB,
  `${sdk}\\platform-tools\\adb.exe`,
  '/opt/homebrew/bin/adb',
  '/usr/local/bin/adb',
  'adb',
].filter(Boolean);

const adb = adbCandidates.find((candidate) => {
  const probe = spawnSync(candidate, ['version'], { encoding: 'utf8' });
  return !probe.error && probe.status === 0;
});

if (!adb) {
  console.error(
    'Could not find adb. Install the Android SDK platform-tools and ensure it is on PATH,\n'
    + 'or set ANDROID_HOME / ANDROID_SDK_ROOT to your SDK location.',
  );
  process.exit(1);
}

const state = spawnSync(adb, ['get-state'], { encoding: 'utf8' });
if (state.error || state.status !== 0 || !/device/.test(state.stdout || '')) {
  console.error(
    'No device/emulator detected. Start it from Android Studio (or `emulator -avd <name>`) and try again.',
  );
  process.exit(1);
}

// Backend :8000 is required. :3000 is added so a `next dev` server is also
// reachable for live-reload workflows; harmless if nothing is listening.
const ports = ['8000', '3000'];
let failed = false;
for (const port of ports) {
  const result = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.error(`Failed to forward tcp:${port}: ${(result.stderr || result.error?.message || '').trim()}`);
    failed = true;
    continue;
  }
  console.log(`Forwarding device localhost:${port} -> host localhost:${port}`);
}

if (failed) process.exit(1);
console.log('\nDevice tunnel ready. Open the app; it will reach the backend at http://localhost:8000.');
