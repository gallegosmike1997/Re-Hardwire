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
};

module.exports = nextConfig;