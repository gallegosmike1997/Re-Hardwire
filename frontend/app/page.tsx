import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="hw-label">Re-Hardwire</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
          Start with where you are.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Reflect on your day, explore a resilience protocol, and choose one
          manageable next step.
        </p>
      </header>
      <Card title="Your next conversation" subtitle="No need for a polished summary.">
        <p className="mb-5 text-sm leading-relaxed text-slate-400">
          Tell the coach what has been happening. You can review the suggested
          protocol and next action alongside your conversation.
        </p>
        <Link
          href="/chat"
          className="hw-focus inline-flex rounded-lg border border-signal-500/40 bg-signal-500/10 px-4 py-2 text-sm font-medium text-signal-300"
        >
          Open chat
        </Link>
      </Card>
      <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
        This is a coaching prototype, not medical care or an emergency service.
        The default backend uses scripted responses rather than a hosted AI model.
        If you are in immediate danger, contact local emergency services.
      </p>
    </div>
  );
}
