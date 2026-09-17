import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: {
    default: `${config.app.name} - Resilience Coaching`,
    template: `%s | ${config.app.name}`,
  },
  description:
    'AI-powered resilience coaching: route every conversation to the right protocol and build back the baseline.',
  applicationName: config.app.name,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
};

export const viewport: Viewport = {
  themeColor: '#05070a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-full bg-void font-sans text-slate-200 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}