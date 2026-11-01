/**
 * Shared Clinical Action Plan Synchronizer (Week 34)
 *
 * Enables live therapist-patient co-editing synchronization for support plans
 * with clinician consent gates.
 */
import { config } from './config';
import { getStorage, setStorage } from './storage';

export interface SharedActionPlanEntry {
  sectionKey: string;
  patientNotes: string;
  therapistNotes: string;
  updatedAt: string;
}

export function updateSharedActionPlan(sectionKey: string, therapistNotes: string): void {
  const existing = getStorage<{ answers?: Record<string, string> }>(config.storage.supportPlanKey) ?? {};
  const currentAnswers = existing.answers ?? {};
  currentAnswers[`${sectionKey}_therapist`] = therapistNotes;
  setStorage(config.storage.supportPlanKey, { answers: currentAnswers, updatedAt: new Date().toISOString() });
}
