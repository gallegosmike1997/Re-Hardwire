'use client';

import { CRISIS_TERMS } from '@/lib/safety';

export function CrisisBar() {
  return (
    <section
      aria-label="Crisis support - this app cannot contact emergency services"
      className="rounded-xl border border-alarm/25 bg-alarm/5 px-3 py-2.5"
    >
      <p className="text-xs leading-relaxed text-slate-300">
        <span className="font-semibold text-slate-100">Not for crisis use.</span>{' '}
        Re-Hardwire cannot assess risk or call for help, even if you describe harm here.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href="tel:988"
          className="hw-focus rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-1.5 text-xs font-semibold text-alarm"
        >
          Call 988
        </a>
        <a
          href="sms:988"
          className="hw-focus rounded-lg border border-edgesoft px-3 py-1.5 text-xs text-slate-200"
        >
          Text 988
        </a>
        <a
          href="/support-plan"
          className="hw-focus rounded-lg px-2 py-1.5 text-xs text-slate-400 underline underline-offset-2"
        >
          Open my support plan
        </a>
      </div>
      <p className="sr-only">{CRISIS_TERMS.join(', ')}</p>
    </section>
  );
}
