/**
 * Spatial Computing & Immersive WebXR Grounding Module (Week 16)
 *
 * Manages 3D spatial audio pacing queues and immersive calm environments
 * for headsets, display glasses, and web canvases.
 */

export interface SpatialEnvironment {
  id: string;
  name: string;
  description: string;
  ambientFrequencyHz: number;
  bgGradient: string;
}

export const SPATIAL_ENVIRONMENTS: SpatialEnvironment[] = [
  {
    id: 'forest_canopy',
    name: 'Serene Forest Canopy',
    description: '3D spatialized pine breeze and gentle ambient frequency (432 Hz).',
    ambientFrequencyHz: 432,
    bgGradient: 'from-emerald-950 via-slate-900 to-ink',
  },
  {
    id: 'mountain_lake',
    name: 'Alpine Mountain Lake',
    description: 'Rhythmic water ripples with slow binaural breathing cues (528 Hz).',
    ambientFrequencyHz: 528,
    bgGradient: 'from-cyan-950 via-slate-900 to-ink',
  },
  {
    id: 'starlight_sky',
    name: 'Starlight Night Sky',
    description: 'Deep spatial silence with subtle pulse constellations (174 Hz).',
    ambientFrequencyHz: 174,
    bgGradient: 'from-indigo-950 via-slate-900 to-ink',
  },
];

export function isWebXrSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'xr' in navigator;
}
