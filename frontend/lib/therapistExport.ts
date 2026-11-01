/**
 * Therapist & Clinical Collaboration Export (Week 13)
 *
 * Generates structured, clinician-friendly text summaries of support plans
 * and coping metrics for counseling sessions.
 */
import { config } from './config';
import { getStorage } from './storage';

export function generateTherapistExport(): string {
  const supportPlan = getStorage<{ answers?: Record<string, string> }>(config.storage.supportPlanKey);
  const wins = getStorage<Array<{ text: string; createdAt: string }>>(config.storage.winsKey) ?? [];
  const boundaries = getStorage<Array<{ title: string; rule: string }>>('rehardwire_boundaries_v1') ?? [];

  const lines = [
    '=== RE-HARDWIRE THERAPIST COLLABORATION SUMMARY ===',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    '--- 1. SUPPORT PLAN SUMMARY ---',
  ];

  if (supportPlan?.answers) {
    for (const [key, value] of Object.entries(supportPlan.answers)) {
      if (value) {
        lines.push(`[${key.toUpperCase()}]:\n${value}\n`);
      }
    }
  } else {
    lines.push('(No support plan saved on device)\n');
  }

  lines.push('--- 2. ESTABLISHED RELATIONSHIP BOUNDARIES ---');
  if (boundaries.length) {
    boundaries.forEach((b, i) => lines.push(`${i + 1}. ${b.title}: ${b.rule}`));
  } else {
    lines.push('(No boundaries recorded)');
  }

  lines.push('');
  lines.push(`--- 3. RECENT WINS & MOMENTUM (${wins.length} total) ---`);
  wins.slice(0, 10).forEach((w, i) => lines.push(`${i + 1}. [${new Date(w.createdAt).toLocaleDateString()}] ${w.text}`));

  lines.push('');
  lines.push('=== END OF SUMMARY ===');
  return lines.join('\n');
}
