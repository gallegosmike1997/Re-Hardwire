# Release and deployment

## Branches

- `main` is the stable release branch. Only merge a reviewed, passing `beta` change into it.
- `beta` is the pre-release branch for the beta circle, debugging, and device verification.
- Open pull requests from `beta` to `main`; wait for the CI checks and review the exact web/native build before merging.
- GitHub branch protection is a repository setting. Require pull requests, no force pushes/deletions, and the `Frontend checks`, `Backend checks`, `Android beta APK`, and `iOS simulator app` checks on `main` after the branches are pushed.

The CI workflow runs lint, type checking, a server build, a static Capacitor build, and the backend test suite on pushes to both branches and on pull requests. The beta workflows also create downloadable Android debug APK and unsigned iOS simulator artifacts for pre-release review; neither workflow signs or publishes an app-store build.

## Free website hosting

The frontend can be hosted as a static site without the prototype backend. Cloudflare Pages is the recommended first deployment because it gives a free `*.pages.dev` subdomain, HTTPS, and preview deployments for non-production branches. The exact `re-hardwire.pages.dev` name is only available if it has not already been claimed. A custom domain is optional and usually costs money; the Pages subdomain is not a domain registration.

Create a Cloudflare Pages project connected to this GitHub repository with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build:capacitor` |
| Build output directory | `out` |
| Environment variable | Leave `NEXT_PUBLIC_API_BASE_URL` unset for the offline-first public preview |

Commits on `beta` should receive preview deployments; only `main` is the production URL. The generated project URL appears after the first successful deployment. Keep the branch push checks enabled before promoting code to `main`.

Preview deployments are public by default. Before sharing beta links, enable the [Pages preview Access policy](https://developers.cloudflare.com/pages/configuration/preview-deployments/) and allow only the beta testers' email addresses. This protects preview URLs; configure production access separately if you do not want the production website public.

The public static build intentionally does not point at `localhost` or at the development API. Guided practices work locally; chat and backend sync stay unavailable until a reviewed, authenticated production API is provisioned. Do not point the public site at the current JSON-file backend. See [the hosting plan](PUBLIC_HOSTING_PLAN.md) and [privacy notes](SECURITY_AND_PRIVACY.md).

The Pages `_headers` file sets the static site's browser security headers and keeps HTML revalidating while allowing long-lived caching for hashed Next assets.

## Android and iOS

The repository uses Capacitor 6. Generate both native project folders once from `frontend/`:

```sh
npm ci
npm run build:capacitor
npx cap add android
npx cap add ios
npx cap sync
```

For Android, install Android Studio and a supported Android SDK/JDK, then open `frontend/android` in Android Studio. Build a debug APK for beta device checks; a signed Android App Bundle (`.aab`) requires a protected upload key and signing configuration before Play Store release.

For iOS, open `frontend/ios/App/App.xcworkspace` in Xcode on macOS. A simulator build can be used for beta verification. Device distribution, TestFlight, and App Store submission require Apple signing assets and an Apple Developer account; none are stored in this repository.

After changing the web app, rebuild and run `npx cap sync` from `frontend/` before opening the native IDE. Do not commit signing certificates, provisioning profiles, API credentials, or user data.

## Public release gates

The current backend is still a local prototype with shared JSON storage and no per-user authorization. A website preview can expose only the static app, with coach and sync features unconfigured. Do not advertise this as a multi-user service or connect a public client to the prototype backend until sign-in, per-user storage, deletion/retention rules, abuse controls, and security review are complete. Independent clinical review and a published privacy policy are also pending before a broad public launch.
