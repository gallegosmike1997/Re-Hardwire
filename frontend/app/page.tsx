import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { OfflineReadinessCard } from '@/components/offline/OfflineReadinessCard';

const quickTools = [
  { title: 'Come back to right now', detail: 'Reconnect with the room around you', href: '/tools#grounding', kind: 'SETTLE', time: '2 min', icon: 'activity' },
  { title: 'Ease your breathing', detail: 'A gentle practice, at your own pace', href: '/tools#breathing', kind: 'SETTLE', time: '1 min', icon: 'refresh' },
  { title: 'Untangle one problem', detail: 'Find a manageable next move', href: '/tools#next-step', kind: 'TAKE A STEP', time: '4 min', icon: 'check' },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 p-1 sm:p-2">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-signal-400/15 bg-gradient-to-br from-signal-500/10 via-panel/80 to-pulse-500/10 p-5 shadow-[0_24px_80px_-54px_rgba(34,211,238,0.4)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-signal-400/[0.08] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-1/2 hidden h-64 w-64 -translate-y-1/2 items-center justify-center lg:flex">
          <div className="absolute h-64 w-64 rounded-full border border-signal-400/10" />
          <div className="absolute h-48 w-48 rounded-full border border-signal-400/10" />
          <div className="absolute h-32 w-32 rounded-full border border-signal-400/15 bg-signal-400/[0.035] shadow-[0_0_80px_-28px_rgba(34,211,238,0.55)]" />
          <Icon name="activity" size={42} className="text-signal-300/75" />
        </div>
        <div className="relative max-w-3xl lg:max-w-[66%]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-ink/35 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
            A moment for you
          </div>
          <h1 className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-slate-100 sm:text-5xl">
            You don’t have to figure it all out right now.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Find a steady next step, explore a guided practice, or put what’s on your mind into words. Start wherever you are.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/now" className="hw-focus inline-flex min-h-12 items-center gap-2 rounded-xl bg-signal-500 px-4 py-3 text-sm font-semibold text-void shadow-glow transition-[transform,background-color,box-shadow] hover:bg-signal-400 active:scale-[0.98]">
              Help me right now <Icon name="chevron" size={16} />
            </Link>
            <Link href="/tools" className="hw-focus inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.1] bg-ink/30 px-4 py-3 text-sm font-medium text-slate-200 transition-[transform,background-color,border-color] hover:border-white/[0.18] hover:bg-ink/55 active:scale-[0.98]">
              Browse guided tools <Icon name="chevron" size={16} />
            </Link>
            <Link href="/chat" className="hw-focus inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.1] bg-ink/30 px-4 py-3 text-sm font-medium text-slate-200 transition-[transform,background-color,border-color] hover:border-white/[0.18] hover:bg-ink/55 active:scale-[0.98]">
              Talk it through <Icon name="chat" size={16} />
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2"><Icon name="check" size={14} className="text-win" /> Guided tools work offline</span>
            <Link href="/support-plan" className="hw-focus rounded text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-slate-200">Make a personal support plan</Link>
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="hw-label">Choose what feels manageable</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">What might help right now?</h2>
          </div>
          <Link href="/tools" className="hw-focus hidden rounded-lg px-3 py-2 text-xs font-medium text-signal-300 transition-colors hover:bg-signal-500/10 sm:block">See all tools <span aria-hidden="true">→</span></Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {quickTools.map((item) => (
            <Link key={item.href} href={item.href} className="hw-focus group rounded-2xl">
              <section className="hw-card h-full p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal-400/10 bg-signal-500/10 text-signal-300 transition-transform duration-200 group-hover:scale-105">
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 font-mono text-[10px] text-slate-500">{item.time}</span>
                </div>
                <p className="mt-5 font-mono text-[10px] tracking-[0.14em] text-signal-400">{item.kind}</p>
                <h3 className="mt-1.5 text-base font-semibold tracking-tight text-slate-100">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.detail}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors group-hover:text-signal-300">
                  Start a practice <Icon name="chevron" size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </section>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="A practice library, ready when you are" subtitle="Short guided exercises you can use at your own pace.">
          <p className="text-xs leading-relaxed text-slate-500">Grounding, gentle breathing, helpful thinking, problem-solving, positive activities, and connection. Choose what suits you and stop whenever you want.</p>
          <Link href="/tools" className="hw-focus mt-4 inline-flex min-h-10 items-center rounded-xl border border-edgesoft px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-signal-500/40 hover:text-signal-300">Explore the library</Link>
        </Card>
        <Card title="Your space, on your device" subtitle="Use the guided library without an account or subscription.">
          <p className="text-xs leading-relaxed text-slate-500">Practice instructions and your support plan stay on this device. Chat transcripts are stored locally, but online chat sends each message to the configured reply service to generate a response. Saving conversation history to a server is a separate optional action.</p>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-600">Re-Hardwire is a self-help coaching app, not medical care or an emergency service. In the U.S., call or text 988 for emotional crisis support.</p>
        </Card>
      </div>
      <OfflineReadinessCard />
    </div>
  );
}
