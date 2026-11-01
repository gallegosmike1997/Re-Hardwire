/**
 * Voice-to-voice coaching pipeline (Week 55)
 * Real-time speech-to-text → local LLM → speech synthesis workflow.
 *
 * Runs entirely offline on modern devices with:
 *  - SpeechRecognition (Web Speech API) for STT
 *  - Local LLM backend for coaching
 *  - SpeechSynthesis for TTS output
 *
 * Created: 11/1/2026 | Author: Michael Gallegos <gallegosmike1997@gmail.com>
 */

import { useState, useCallback, useRef, useEffect } from 'react';