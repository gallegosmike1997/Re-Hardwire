'use client';

import { Button } from '@/components/ui';

interface CrisisInterceptProps {
  onSendAnyway: () => void;
  onChoosePractice: () => void;
  onDismiss: () => void;
}

export function CrisisIntercept({ onSendAnyway, onChoosePractice, onDismiss }: CrisisInterceptProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="crisis-intercept-title"
      aria-describedby="crisis-intercept-desc"
      className="rounded-xl border border-alarm/30 bg-alarm/5 p-4"
    >
      <h2 id="crisis-intercept-title" className="text-sm font-semibold text-slate-100">
        Pause - this sounds bigger than coaching
      </h2>
      <p id="crisis-intercept-desc" className="mt-1 text-xs leading-relaxed text-slate-300">
        Your message uses wording about harm. Re-Hardwire cannot assess risk or contact help for
        you. Please reach a person right now. You can still send your message, but the safest
        next step is outside this app.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="tel:988"
          className="hw-focus inline-flex min-h-10 items-center rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-sm font-semibold text-alarm"
        >
          Call 988
        </a>
        <a
          href="sms:988"
          className="hw-focus inline-flex min-h-10 items-center rounded-lg border border-edgesoft px-3 py-2 text-sm text-slate-200"
        >
          Text 988
        </a>
        <Button variant="ghost" size="sm" onClick={onChoosePractice}>
          Open a grounding practice instead
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
        <Button variant="ghost" size="sm" onClick={onSendAnyway}>
          Send anyway
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Edit message
        </Button>
      </div>
    </div>
  );
}
