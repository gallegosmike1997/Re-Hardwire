import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

const choices = [
  {
    title: 'Help me feel a little steadier',
    detail: 'Look around and reconnect with the room, or try an easy breath.',
    href: '/tools#grounding',
    label: 'Grounding',
    icon: 'activity',
  },
  {
    title: 'Sort through what is on my mind',
    detail: 'Make room for a thought that is honest and a little more helpful.',
    href: '/tools#helpful-thinking',
    label: 'Helpful thinking',
    icon: 'refresh',
  },
  {
    title: 'Find one small next step',
    detail: 'Break a problem down and choose a manageable first move.',
    href: '/tools#next-step',
    label: 'Problem solving',
    icon: 'check',
  },
  {
    title: 'Reach toward connection',
    detail: 'Think about a safe person, place, or source of support.',
    href: '/tools#connection',
    label: 'Connection',
    icon: 'chat',
  },
] as const;

export default function NowPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 p-1 sm:p-2">
      <header className="max-w-2xl space-y-3">
        <p className="hw-label">A small choice, for this moment</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">What would feel useful right now?</h1>
        <p className="text-sm leading-relaxed text-slate-400 sm:text-base">You do not need to explain or rate how you feel. Pick a direction, skip anything that does not suit you, or close the app and come back later.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Choose a kind of support">
        {choices.map((choice) => (
          <Link key={choice.href} href={choice.href} className="hw-focus rounded-2xl">
            <Card padded={false} className="h-full p-5 transition-transform hover:-translate-y-0.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-signal-400/15 bg-signal-500/10 text-signal-300">
                <Icon name={choice.icon} size={20} />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-100">{choice.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{choice.detail}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-signal-300">Open {choice.label}<Icon name="chevron" size={14} /></span>
            </Card>
          </Link>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/support-plan" className="hw-focus rounded-lg border border-edgesoft px-4 py-3 text-sm text-slate-300 hover:bg-panelsoft">Open my support plan</Link>
        <Link href="/tools" className="hw-focus rounded-lg px-4 py-3 text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200">Browse every practice</Link>
      </div>

      <aside className="rounded-xl border border-alarm/20 bg-alarm/5 p-4" aria-label="Urgent support">
        <p className="text-sm font-semibold text-slate-100">If you may be in immediate danger</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">Contact local emergency services or someone who can be with you. In the U.S., call or text 988 for emotional crisis support. Phone service is needed; the app cannot contact anyone for you.</p>
        <a href="tel:988" className="hw-focus mt-3 inline-flex min-h-10 items-center rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-sm font-medium text-alarm">Call 988</a>
      </aside>
      <p className="text-[11px] leading-relaxed text-slate-600">These are self-guided educational practices, not a diagnosis or a substitute for care. Stop or switch if something feels uncomfortable.</p>
    </div>
  );
}
