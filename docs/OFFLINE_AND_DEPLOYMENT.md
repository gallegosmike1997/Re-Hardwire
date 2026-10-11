# Offline use and low-cost deployment

Re-Hardwire's guided practice library, local profile, interface preferences, and saved sessions work on the device without a paid API. Coach chat can keep a local transcript and offer a clear offline check-in, but personalized coach replies and server history sync require the configured backend.

## Web app

1. Install the frontend dependencies with `npm ci` from `frontend/`.
2. Build and serve the web app from a static host that supports HTTPS. The service worker needs HTTPS (localhost is also supported by browsers).
3. Open the app while connected and use **Prepare for offline** on the home screen. It caches and verifies core pages and app files. Reopen it from the installed home-screen shortcut for offline use.

The static app has no required hosted model or paid service for its guided tools. Production builds do not contact localhost; chat and cross-device profile/history sync remain unavailable unless a reviewed API URL is explicitly configured at build time. Never put provider API secrets in that public frontend setting. See [release and hosting setup](RELEASE_AND_DEPLOYMENT.md) for the Cloudflare Pages and native app steps.

The backend still stores profiles and history in per-subject JSON files with a self-signed, non-rotating HMAC device token (no real identity provider) and no durable database. It fails to start with `APP_ENV=production` until a managed identity and durable, reviewed storage replace them. Requests are isolated per device subject and require a session token, so the prototype is safe to run locally against one or more devices, but do not connect a static frontend to an internet-accessible instance of this prototype.

## Developing the native app against a local backend

The Capacitor WebView is served from `http://localhost`, so a debug build can talk to a backend running on this machine. Chromium's **Local Network Access** protection blocks the WebView from reaching the host at the private alias `http://10.0.2.2:8000` (`net::ERR_LOCAL_NETWORK_PERMISSION_MISSING`), so use loopback instead:

1. Run the backend (`npm run dev`) and copy `frontend/.env.example` to `frontend/.env.local` (it sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`).
2. With the emulator or a USB device connected, run `npm run android:link`. It runs `adb reverse tcp:8000 tcp:8000` (and `:3000`), tunnelling the device's `localhost:8000` to this machine's `localhost:8000`. Re-run it after reconnecting or rebooting the device.
3. Build the web bundle and sync it: `npm run build:capacitor`, then `npx --prefix frontend cap sync android`.
4. Install the debug APK and open the app. Coach chat now reaches the local backend and replies are personalised from the on-device profile.

The debug-only manifest overlay (`frontend/android/app/src/debug/`) permits cleartext HTTP to loopback/`10.0.2.2`; the release APK does not include it and keeps cleartext blocked. The dev-backend URL lives only in the git-ignored `.env.local`, so it is never baked into the CI beta APK.

## Native app bundle

From `frontend/`, run `npm ci`, then `npm run build:capacitor`. The static assets are written to `frontend/out/`; Capacitor can bundle those assets for Android or iOS so the guided library works without a first web visit. Add the platform once with `npx cap add android` or `npx cap add ios`, then run `npx cap sync` when the web bundle changes.

## Scope of offline mode

- Guided practices and their instructions are bundled with the app and do not make network requests.
- Profile/preferences, wins, the personal support plan, and session transcripts are kept locally first. The support plan is never sent to the configured backend. Pending profile changes and remote session deletions retry when the backend is available.
- Browser local storage is not encrypted by Re-Hardwire. The Settings page can export or clear the app's local data; clearing it does not delete records already sent to a backend.
- 988 and emergency contacts require a phone or data connection. They cannot be reached by the app without a connection.
- Coach chat does not run a language model on-device. Without its backend it says so and links to the local practice library.
- The offline checker verifies cached core pages and static files; it does not include chat content or personal support-plan entries in the download. Guided practice saves and feedback are stored locally.
- Conversations are not shared with clinicians. Online coach messages still go to the configured reply backend/provider to generate a response; this is not clinical review.
- The support-plan page is a self-authored worksheet, not risk assessment or clinician-led safety-planning intervention. It cannot call or alert anyone. U.S. call/text support requires phone service; web support requires internet.
