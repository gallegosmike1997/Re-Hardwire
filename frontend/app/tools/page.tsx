'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

type Skill = {
  id: string;
  title: string;
  group: 'Settle' | 'Think' | 'Act' | 'Connect';
  time: string;
  description: string;
  source: string;
  sourceUrl: string;
  steps: string[];
  careNote?: string;
};

const SKILLS: Skill[] = [
  {
    id: 'grounding',
    title: 'Come back to right now',
    group: 'Settle',
    time: '2 minutes',
    description: 'Use the room around you to reconnect with the present moment.',
    source: 'VA National Center for PTSD · grounding',
    sourceUrl: 'https://www.ptsd.va.gov/disaster_events/for_everyone/selfcare_after_disaster.asp',
    steps: [
      'Keep your eyes open if that feels okay. Say your name, where you are, and today’s date.',
      'Slowly look around. Name three things you can see, noticing their color, shape, or texture.',
      'Notice two sounds. Then notice one point where your body is supported by a chair, floor, or other surface.',
      'Choose one neutral detail in the room and let your attention rest there for a few breaths.',
    ],
    careNote: 'If focusing on your senses makes things feel harder, stop and choose another kind of support.',
  },
  {
    id: 'breathing',
    title: 'Ease the pace of your breathing',
    group: 'Settle',
    time: '1 minute',
    description: 'Try a gentle, unforced breath with a comfortable, easy exhale.',
    source: 'VA National Center for PTSD · physical strategies',
    sourceUrl: 'https://www.ptsd.va.gov/professional/treat/care/toolkits/provider/selfHelpPhysical.asp',
    steps: [
      'Let your shoulders drop if that is comfortable. Keep your eyes open or closed, whichever feels better.',
      'Breathe in gently through your nose, without taking a bigger breath than usual.',
      'Let the air out slowly and easily. There is no need to hold your breath or count.',
      'Repeat for a few comfortable breaths, then let your breathing return to its own rhythm.',
    ],
    careNote: 'Stop and breathe normally if you feel dizzy, uncomfortable, or more distressed. You can skip this tool.',
  },
  {
    id: 'helpful-thinking',
    title: 'Make room for a helpful thought',
    group: 'Think',
    time: '3 minutes',
    description: 'Notice a stressful thought and look for a kinder, useful way to hold it.',
    source: 'VA Skills for Psychological Recovery · helpful thinking',
    sourceUrl: 'https://www.ptsd.va.gov/disaster_events/for_everyone/helpful_thinking.asp',
    steps: [
      'Name the situation in one plain sentence. You do not need to describe every detail.',
      'Notice what your mind is saying about it. A thought is something you are having; it does not have to be a complete picture.',
      'Ask: what would I say to someone I care about who was facing this? Keep the real difficulty in view.',
      'Choose one thought that feels both honest and a little more helpful. It does not need to sound positive.',
    ],
  },
  {
    id: 'next-step',
    title: 'Untangle one problem',
    group: 'Act',
    time: '4 minutes',
    description: 'Break one concern into options and a small first move.',
    source: 'VA Skills for Psychological Recovery · problem-solving',
    sourceUrl: 'https://www.ptsd.va.gov/disaster_events/for_providers/skills_psych_recovery.asp',
    steps: [
      'Pick one problem that is weighing on you. Set aside the parts you cannot influence right now.',
      'What would “a little better” look like? Make the goal small and specific.',
      'Think of two possible first moves. Asking someone for help or taking a short break can count.',
      'Choose one move you can try. Decide when you will do it, or what might get in the way.',
    ],
  },
  {
    id: 'small-activity',
    title: 'Choose a small restoring activity',
    group: 'Act',
    time: '2 minutes',
    description: 'Make space for one manageable activity that has mattered to you before.',
    source: 'VA Skills for Psychological Recovery · positive activities',
    sourceUrl: 'https://www.ptsd.va.gov/disaster_events/for_providers/skills_psych_recovery.asp',
    steps: [
      'Think of one small activity that has felt comforting, interesting, or meaningful before.',
      'Shrink it until it feels doable today: a few minutes of music, fresh air, a stretch, or a message to someone.',
      'Pick a time and place. You do not have to wait until you feel motivated.',
      'Afterward, notice what the experience was like. It is okay if your mood did not change.',
    ],
  },
  {
    id: 'connection',
    title: 'Reach toward support',
    group: 'Connect',
    time: '2 minutes',
    description: 'Decide whether there is a safe person who could make this moment less lonely.',
    source: 'VA Skills for Psychological Recovery · social connections',
    sourceUrl: 'https://www.ptsd.va.gov/disaster_events/for_providers/skills_psych_recovery.asp',
    steps: [
      'Think of someone who has been safe or supportive for you. You do not have to contact anyone who does not feel safe.',
      'Choose the easiest way to reach them: a call, text, or being in the same room.',
      'If words are hard, you could say: “I’m having a rough moment. Could you check in with me? You don’t have to fix it.”',
      'If no one comes to mind, consider a local support service or a mental health professional when you can access one.',
    ],
  },
];

const GROUPS = ['All tools', 'Settle', 'Think', 'Act', 'Connect'] as const;

export default function ToolsPage() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All tools');
  const [active, setActive] = useState<Skill | null>(null);
  const [step, setStep] = useState(0);
  const practiceRef = useRef<HTMLElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SKILLS.filter((skill) => {
      const matchesGroup = group === 'All tools' || skill.group === group;
      const matchesQuery = !needle || `${skill.title} ${skill.group} ${skill.description}`.toLowerCase().includes(needle);
      return matchesGroup && matchesQuery;
    });
  }, [group, query]);

  const begin = (skill: Skill) => {
    setActive(skill);
    setStep(0);
    window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const next = () => {
    if (!active) return;
    setStep((current) => Math.min(current + 1, active.steps.length));
  };

  useEffect(() => {
    const skill = SKILLS.find((item) => item.id === window.location.hash.slice(1));
    if (!skill) return;
    // The initial hash is browser state; select its practice after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(skill);
    window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-1 sm:p-2">
      <header className="space-y-3">
        <p className="hw-label">Tools for the moment you’re in</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
          A little support, right when you need it.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Choose a short guided practice. The exercises and instructions run on your device and are available offline after the app is loaded.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-win/20 bg-win/5 px-3 py-1.5 text-xs text-win">
          <span className="h-1.5 w-1.5 rounded-full bg-win" />
          No account or connection needed for these tools
        </div>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
          These practices link to public VA self-help sources. Re-Hardwire adaptations have not yet received independent clinical review, and VA does not endorse this app.
        </p>
      </header>

      <section aria-label="Find a practice" className="hw-panel space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search guided practices</span>
            <Icon name="activity" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What would help right now?"
              className="hw-focus w-full rounded-lg border border-edgesoft bg-void/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </label>
          <p className="text-xs text-slate-500">Pick what feels right. You can stop or switch at any time.</p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter by kind of support">
          {GROUPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGroup(item)}
              aria-pressed={group === item}
              className={[
                'hw-focus min-h-10 rounded-full border px-4 py-2 text-xs transition-colors',
                group === item
                  ? 'border-signal-500/40 bg-signal-500/10 text-signal-300'
                  : 'border-edgesoft bg-panelsoft/50 text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <article id={skill.id} key={skill.id} className="hw-card flex flex-col p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full border border-signal-500/10 bg-signal-500/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-signal-300">{skill.group}</span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 font-mono text-[10px] text-slate-500">{skill.time}</span>
              </div>
              <h2 className="text-base font-semibold tracking-tight text-slate-100">{skill.title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{skill.description}</p>
              <button
                type="button"
                onClick={() => begin(skill)}
                aria-expanded={active?.id === skill.id}
                className="hw-focus mt-4 inline-flex min-h-10 items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-medium text-signal-300 transition-colors hover:bg-signal-500/10"
              >
                {active?.id === skill.id ? 'Restart practice' : 'Start practice'}
                <Icon name="chevron" size={14} className="rotate-0" />
              </button>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-edgesoft p-5 text-sm text-slate-500">
              No practice matches that search. Try a shorter phrase or choose another filter.
            </p>
          )}
        </div>
      </section>

      {active && (
        <section ref={practiceRef} id="guided-practice" tabIndex={-1} aria-labelledby="practice-title" className="hw-panel scroll-mt-24 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge/70 px-4 py-4 sm:px-6">
            <div>
              <p className="hw-label">Guided practice · {active.group.toLowerCase()} · {active.time}</p>
              <h2 id="practice-title" className="mt-1 text-xl font-semibold text-slate-100">{active.title}</h2>
            </div>
            <button type="button" onClick={() => setActive(null)} className="hw-focus rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-panelsoft hover:text-slate-200">Close</button>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-7">
            {step < active.steps.length ? (
              <div aria-live="polite" aria-atomic="true">
                <div className="mb-5 flex items-center gap-2" aria-label={`Step ${step + 1} of ${active.steps.length}`}>
                  {active.steps.map((_, index) => (
                    <span key={index} className={['h-1.5 flex-1 rounded-full', index <= step ? 'bg-signal-400' : 'bg-edgesoft'].join(' ')} />
                  ))}
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">Step {step + 1} of {active.steps.length}</p>
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-100 sm:text-xl">{active.steps[step]}</p>
                {active.careNote && <p className="mt-4 max-w-2xl text-xs leading-relaxed text-slate-500">{active.careNote}</p>}
                <div className="mt-7 flex flex-wrap gap-2">
                  {step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="hw-focus rounded-lg border border-edgesoft px-4 py-2.5 text-sm text-slate-300 hover:bg-panelsoft">Back</button>}
                  <button type="button" onClick={next} className="hw-focus inline-flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-signal-400">
                    {step === active.steps.length - 1 ? 'Finish practice' : 'Continue'}
                    <Icon name="chevron" size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <p className="hw-label">Practice complete</p>
                <h3 className="text-xl font-semibold text-slate-100">Take a moment to notice what you need next.</h3>
                <p className="text-sm leading-relaxed text-slate-400">There is no right result. You can try another tool, pause here, or reach out to someone you trust.</p>
                <button type="button" onClick={() => { setActive(null); setStep(0); }} className="hw-focus rounded-lg border border-edgesoft px-4 py-2 text-sm text-slate-300 hover:bg-panelsoft">Choose another tool</button>
              </div>
            )}
          </div>

          <div className="border-t border-edge/70 bg-panelsoft/25 px-4 py-3 sm:px-6">
            <p className="text-[11px] leading-relaxed text-slate-600">
              Adapted from public self-help resources: <a className="hw-focus rounded text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-signal-300" href={active.sourceUrl} target="_blank" rel="noreferrer">{active.source}</a>. Re-Hardwire is not affiliated with or endorsed by these organizations.
            </p>
          </div>
        </section>
      )}

      <aside className="rounded-xl border border-alarm/20 bg-alarm/5 p-4 sm:p-5" aria-label="Crisis support">
        <p className="text-sm font-semibold text-slate-100">Need urgent support?</p>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
          These self-guided tools are not crisis care or a replacement for counseling. If you are in immediate danger, contact local emergency services. In the U.S., call or text 988 for free, confidential emotional crisis support. A phone or data connection is required.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="tel:988" className="hw-focus inline-flex items-center rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-sm font-medium text-alarm hover:bg-alarm/15">Call 988</a>
          <a href="sms:988" className="hw-focus inline-flex items-center rounded-lg border border-edgesoft bg-panelsoft/70 px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-100">Text 988</a>
          <Link href="/support-plan" className="hw-focus inline-flex items-center rounded-lg border border-edgesoft bg-panelsoft/70 px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-100">Open my offline support plan</Link>
          <Link href="/chat" className="hw-focus inline-flex items-center rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-panelsoft hover:text-slate-200">Open coach chat</Link>
        </div>
        <p className="mt-3 text-[11px] text-slate-600"><a className="hw-focus rounded underline underline-offset-2 hover:text-slate-300" href="https://988lifeline.org/about/" target="_blank" rel="noreferrer">About the 988 Lifeline</a></p>
      </aside>

      <footer className="text-[11px] leading-relaxed text-slate-600">
        These brief practices are adapted from self-help materials published by the U.S. Department of Veterans Affairs. They are educational self-help, not therapy, diagnosis, or a treatment plan. A skill may not suit every person or situation; stop if it makes things harder.
      </footer>
    </div>
  );
}
