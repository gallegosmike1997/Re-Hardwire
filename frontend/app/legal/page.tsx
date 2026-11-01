import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LEGAL_VERSION, PRACTICE_PACK_VERSION, REVIEW_STATUS } from '@/lib/legal';
import { LEGAL_SECTIONS } from '@/lib/legal-sections';

export const metadata = {
  title: 'Legal - Medical & Legal Disclaimer',
  description: 'Re-Hardwire medical and legal disclaimer: self-help only, no monitoring, beta limits.',
};

export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="hw-label">Legal</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Medical &amp; legal disclaimer
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-slate-500">
          Self-help only. Not medical care. No monitoring or rescue. Version {LEGAL_VERSION} -
          practice pack {PRACTICE_PACK_VERSION} ({REVIEW_STATUS}).
        </p>
      </header>

      <Card title="In short" subtitle="Read this first.">
        <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
          <li>• Education and self-guided support only. No diagnosis, treatment, risk assessment, or monitoring.</li>
          <li>• Cannot call for help. U.S. crisis: call or text <a className="underline" href="tel:988">988</a>. Emergency: <a className="underline" href="tel:911">911</a>.</li>
          <li>• Practices adapt public VA materials; no independent clinical review yet.</li>
          <li>• Local data is not encrypted. Online chat sends messages to the configured service. Beta software, as-is, at your own risk.</li>
        </ul>
      </Card>

      {LEGAL_SECTIONS.map((section) => (
        <Card key={section.id} title={section.heading}>
          <div className="space-y-2">
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-slate-400">{paragraph}</p>
            ))}
          </div>
        </Card>
      ))}

      <Card title="Contact and review status">
        <p className="text-sm leading-relaxed text-slate-400">
          Questions about this disclaimer: support@re-hardwire.example. Clinical content policy and
          source register are maintained with the project docs. Practice adaptations remain
          pending independent review - do not rely on them as validated treatment.
        </p>
        <Link href="/settings" className="hw-focus mt-3 inline-flex min-h-10 items-center rounded-xl border border-edgesoft px-3 py-2 text-xs text-slate-300 hover:bg-panelsoft">
          Back to Settings
        </Link>
      </Card>
    </div>
  );
}
