'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { config } from '@/lib/config';
import { getStorage, removeStorage, setStorage } from '@/lib/storage';

type SupportPlan = Record<string, string>;
type SavedSupportPlan = { answers: SupportPlan; updatedAt: string };

const SECTIONS = [
  {
    key: 'warningSigns',
    title: '1. Signs I may need to use this plan',
    hint: 'Thoughts, feelings, situations, or changes you notice when things are getting harder.',
  },
  {
    key: 'coping',
    title: '2. Things I can try on my own',
    hint: 'Small actions that have helped you get through a difficult moment before.',
  },
  {
    key: 'distractions',
    title: '3. People or places that help me feel less alone',
    hint: 'A safe person, public place, or everyday activity that can offer connection or distraction.',
  },
  {
    key: 'supportPeople',
    title: '4. People I can ask for help',
    hint: 'Names and the best way to reach people you trust. Ask them first if you plan to include their contact details.',
  },
  {
    key: 'professionalHelp',
    title: '5. Professional and crisis support',
    hint: 'Your clinician, local support service, or emergency department and how to contact them.',
  },
  {
    key: 'saferSpace',
    title: '6. Steps that could make my surroundings safer',
    hint: 'A practical step and a trusted person who could help. Avoid writing sensitive access or location details here.',
  },
] as const;

const EMPTY_PLAN: SupportPlan = Object.fromEntries(SECTIONS.map(({ key }) => [key, '']));

export default function SupportPlanPage() {
  const [answers, setAnswers] = useState<SupportPlan>(EMPTY_PLAN);
  const [hydrated, setHydrated] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const saved = getStorage<SavedSupportPlan>(config.storage.supportPlanKey);
    // localStorage is only available after mount, so apply its saved form state here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved?.answers) setAnswers({ ...EMPTY_PLAN, ...saved.answers });
    if (saved?.updatedAt) setUpdatedAt(saved.updatedAt);
    setHydrated(true);
  }, []);

  const save = () => {
    const timestamp = new Date().toISOString();
    setStorage(config.storage.supportPlanKey, { answers, updatedAt: timestamp } satisfies SavedSupportPlan);
    setUpdatedAt(timestamp);
    setDirty(false);
    setNotice('Saved on this device. This plan is not sent to the coach or backend.');
  };

  const clear = () => {
    if (!confirm('Delete the support plan saved on this device? This cannot be undone.')) return;
    removeStorage(config.storage.supportPlanKey);
    setAnswers({ ...EMPTY_PLAN });
    setUpdatedAt(null);
    setDirty(false);
    setNotice('The saved plan was deleted from this browser profile.');
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <p className="hw-label">Available offline</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">My support plan</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Write down people, places, and actions you may want to remember during a difficult moment. You can fill this out at your own pace and update it whenever you like.
        </p>
      </header>

      <section role="note" className="rounded-xl border border-warmth/20 bg-warmth/5 p-4 text-xs leading-relaxed text-slate-300">
        This is a personal worksheet on this device, not a risk assessment or professional safety-planning session. The app does not monitor you or contact anyone. Browser storage is not encrypted by Re-Hardwire, so do not include details that could put you at risk if someone else accesses this device. When possible, make or review a crisis safety plan with a qualified professional or trusted person.
      </section>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section key={section.key} className="hw-panel space-y-2 p-4 sm:p-5">
            <label htmlFor={`plan-${section.key}`} className="block text-sm font-semibold text-slate-100">
              {section.title}
            </label>
            <p id={`hint-${section.key}`} className="text-xs leading-relaxed text-slate-500">{section.hint}</p>
            <textarea
              id={`plan-${section.key}`}
              aria-describedby={`hint-${section.key}`}
              rows={3}
              value={answers[section.key] ?? ''}
              onChange={(event) => {
                setAnswers((current) => ({ ...current, [section.key]: event.target.value }));
                setDirty(true);
                setNotice('');
              }}
              className="hw-focus w-full resize-y rounded-lg border border-edgesoft bg-void/70 px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600"
              placeholder="Add notes if you want…"
            />
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          disabled={!hydrated || !dirty}
          onClick={save}
          className="hw-focus rounded-lg bg-signal-500 px-4 py-2.5 text-sm font-semibold text-void hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save on this device
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="hw-focus rounded-lg border border-edgesoft px-4 py-2.5 text-sm text-slate-200 hover:bg-panelsoft"
        >
          Print plan
        </button>
        <button
          type="button"
          onClick={clear}
          className="hw-focus rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:text-alarm"
        >
          Delete saved plan
        </button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {notice || (dirty ? 'Unsaved changes' : updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : 'Not saved yet')}
        </span>
      </div>

      <section className="rounded-xl border border-alarm/20 bg-alarm/5 p-4 sm:p-5" aria-label="Urgent support">
        <h2 className="text-sm font-semibold text-slate-100">If you may hurt yourself or cannot stay safe</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Contact local emergency services or a person who can be with you. In the U.S., call or text 988 for the Suicide &amp; Crisis Lifeline. Phone or internet service is needed to reach these services; this app cannot place a call while offline.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="tel:988" className="hw-focus rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-sm font-semibold text-alarm">Call 988</a>
          <a href="sms:988" className="hw-focus rounded-lg border border-edgesoft bg-panelsoft/70 px-3 py-2 text-sm font-medium text-slate-200">Text 988</a>
          <a href="https://988lifeline.org/help-yourself/" target="_blank" rel="noreferrer" className="hw-focus rounded-lg px-3 py-2 text-sm text-slate-400 underline underline-offset-2">988 help and safety planning</a>
        </div>
      </section>

      <footer className="text-xs leading-relaxed text-slate-600">
        This worksheet follows the broad sections of the{' '}
        <a className="hw-focus rounded text-slate-400 underline underline-offset-2" href="https://www.ptsd.va.gov/appvid/mobile/safety_plan_app.asp" target="_blank" rel="noreferrer">VA National Center for PTSD Safety Plan</a>, which recommends making a plan before a crisis and notes that professional support can help. Re-Hardwire is not affiliated with or endorsed by VA.
        {' '}<Link className="hw-focus rounded text-slate-400 underline underline-offset-2" href="/settings">Manage or export local data</Link>.
      </footer>
    </div>
  );
}
