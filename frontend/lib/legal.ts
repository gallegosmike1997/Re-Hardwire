/**
 * Re-Hardwire legal + medical disclaimer content.
 * Single source of truth for the first-launch modal, /legal, Settings.
 */

export const LEGAL_VERSION = '2026-10-16-beta';
export const LEGAL_STORAGE_KEY = 're-hardwire-legal';
export const LEGAL_ACCEPTED_VERSION = '2026-10-16-beta';
export const LEGAL_CONTACT_EMAIL = 'support@re-hardwire.example';
export const PRACTICE_PACK_VERSION = '1.0.0';
export const REVIEW_STATUS = 'independent_review_pending';

export interface LegalSection {
  id: string;
  heading: string;
  body: string[];
}

export const FIRST_LAUNCH_SUMMARY: string[] = [
  'Re-Hardwire is for education and self-guided support only. It does not diagnose, treat, assess risk, monitor you, or replace care from a qualified professional.',
  'It cannot call for help for you. Guided practices adapt public VA self-help materials and have NOT had independent clinical review.',
  'If you are in crisis in the U.S., call or text 988 now. If you may act on thoughts of harming yourself, call 911 or go to your nearest emergency department.',
  'Local app data is not encrypted. Online chat sends each message to the configured reply service. Use is at your own risk.',
];
