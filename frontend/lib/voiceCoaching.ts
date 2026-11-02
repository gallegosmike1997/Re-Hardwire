/**
 * Voice-to-voice coaching pipeline (Week 55/56)
 * Real-time speech-to-text → local LLM → speech synthesis workflow.
 * Runs entirely offline on modern devices with:
 *  - SpeechRecognition (Web Speech API) for STT
 *  - Local LLM backend for coaching
 *  - SpeechSynthesis for TTS output
 *  - Emotion-aware protocol switching (Week 56)
 *
 * Created: 11/1/2026 | Author: Michael Gallegos <gallegosmike1997@gmail.com>
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** Emotional states recognized from user text. */
export type EmotionalState =
  | 'stable'
  | 'activated'
  | 'overwhelmed'
  | 'depleted'
  | 'numb'
  | 'mixed';

/** Frustration / distress signal detectors. */
const DISTRESS_TERMS = [
  'frustrated', 'annoyed', 'angry', 'upset', 'fed up', 'at my limit',
  'giving up', 'can\'t do this', 'too much', 'cannot cope', 'help me',
  'enough', 'stop', 'no more', 'sick of', 'tired of',
];

const CALMING_SIGNALS = ['breathe', 'calm', 'peace', 'ground', 'reset'];

/** Map detected emotional state to a calming protocol name. */
function mapToCalmingProtocol(state: EmotionalState): string {
  switch (state) {
    case 'activated': return 'Stabilise & Breathe';
    case 'overwhelmed': return 'Stabilise & Breathe';
    case 'depleted': return 'Ground & Regulate';
    case 'numb': return 'Ground & Regulate';
    default: return 'Stabilise & Breathe';
  }
}

/** Detect emotional state from user text using simple lexicon. */
function detectEmotionalState(userText: string): EmotionalState {
  const lower = userText.toLowerCase();
  const stressTerms = ['stressed', 'stress', 'panic', 'anxious', 'overwhelmed', 'activated', 'tense', 'tension',
    'crisis', 'help', 'urgent', 'emergency'];
  const depletionTerms = ['exhausted', 'drained', 'empty', 'burned out', 'burnout', 'depleted', 'flat',
    'tired', 'no energy', 'low energy', 'no more', 'done'];
  const numbTerms = ['numb', 'blank', 'checked out', "don't care",
    'nothing matters', 'hollow'];

  let stressCount = 0;
  let depletionCount = 0;
  let numbCount = 0;

  for (const term of stressTerms) {
    if (lower.includes(term)) stressCount++;
  }
  for (const term of depletionTerms) {
    if (lower.includes(term)) depletionCount++;
  }
  for (const term of numbTerms) {
    if (lower.includes(term)) numbCount++;
  }

  // Check for calming signals that override distress
  const hasCalm = CALMING_SIGNALS.some((s) => lower.includes(s));
  if (hasCalm) return 'stable';

  if (stressCount > 1 || (stressCount > 0 && depletionCount > 0)) return 'overwhelmed';
  if (stressCount > 0) return 'activated';
  if (numbCount > 0) return 'numb';
  if (depletionCount > 1) return 'overwhelmed';
  if (depletionCount > 0) return 'depleted';
  return 'stable';
}

/** Speak text using Web Speech API. */
function speakTxt(txt: string): void {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth || !txt.trim()) return;
  const utt = new SpeechSynthesisUtterance(txt);
  synth.speak(utt);
}

/** Generate a coaching response based on detected emotional state. */
function generateResponse(userText: string): { reflection: string; nextStep: string; protocol: string } {
  const state = detectEmotionalState(userText);
  const protocol = mapToCalmingProtocol(state);

  const reflections: Record<EmotionalState, string> = {
    stable: 'I hear the care and intention behind what you are sharing.',
    activated: 'There is high operational tension running through your system.',
    overwhelmed: 'Too many signals are hitting your system simultaneously.',
    depleted: 'You sound like the tank is genuinely empty, not just low.',
    numb: 'That sounds flat - more switched off than wound up.',
    mixed: 'There is real drive in this, and real weight sitting on top of it.',
  };

  const actionAdvice: Record<EmotionalState, string> = {
    stable: 'What is the single most supportive next step you can take?',
    activated: 'Pause before reacting and drop your shoulders away from your ears.',
    overwhelmed: "Let's narrow your focus to the next ten minutes only.",
    depleted: "Protect tonight's recovery window above all else.",
    numb: 'What is one small thing that might bring a bit of warmth or connection?',
    mixed: 'What feels hardest about making that call?',
  };

  return {
    reflection: reflections[state],
    nextStep: actionAdvice[state],
    protocol,
  };
}

/** Exported hooks */
export { detectEmotionalState, generateResponse, mapToCalmingProtocol };