/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig = {
  reactStrictMode: true,
  // Required so Capacitor can resolve file:// routes on device.
  trailingSlash: true,
  images: {
    // Capacitor serves a static bundle; the Next image optimizer is unavailable.
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  // Native shells need a fully static export in `out/`.
  ...(isCapacitorBuild ? { output: 'export' } : {}),
  // Native static exports cannot set response headers; apply these when the
  // Next.js web server is hosting the app.
  ...(!isCapacitorBuild ? {
    async headers() {
      return [{
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      }];
    },
  } : {}),
};

module.exports = nextConfig;
