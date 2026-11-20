/* presets.js — four colour grades for the cover studio.
 * Every preset shares the same photo-led rule: the hero grade is light
 * (gradient map at most 0.3, posterize luma-8, no halftone on faces).
 * The heavy print look lives in PRESETS' heavy slot, applied only to
 * small panels and to drawn title graphics.
 */

export const RAMP_VICE = [[42, 14, 63], [200, 57, 122], [255, 217, 160]];
export const RAMP_DUSK = [[38, 16, 74], [150, 60, 140], [255, 200, 190]];
export const RAMP_NEON = [[18, 10, 62], [90, 40, 150], [255, 190, 220]];
export const RAMP_WARM = [[52, 26, 40], [190, 110, 70], [255, 225, 170]];

export const PRESETS = [
  {
    id: 'vice', name: 'Vice Sunset', def: true,
    ramp: RAMP_VICE, grade: 1, mapAmount: 0.3, poster: 'luma8',
    heavy: { mapAmount: 0.6, poster: 'heavy', halftoneCell: 9 },
    accent: '#e82e8a', sky: ['#e89ab0', '#f2a35e'], title: ['#fff3c4', '#f2a35e', '#e82e8a'],
    bg: '#160027', band: '#b8326e', ink: '#160027',
  },
  {
    id: 'dusk', name: 'Dusk Pink',
    ramp: RAMP_DUSK, grade: 1, mapAmount: 0.28, poster: 'luma8',
    heavy: { mapAmount: 0.55, poster: 'heavy', halftoneCell: 8 },
    accent: '#c22a3a', sky: ['#6a4a9e', '#e88aa0'], title: ['#ffe9f2', '#e88aa0', '#c22a3a'],
    bg: '#160027', band: '#7a2a6e', ink: '#160027',
  },
  {
    id: 'neon', name: 'Night Neon',
    ramp: RAMP_NEON, grade: 1.1, mapAmount: 0.3, poster: 'luma8',
    heavy: { mapAmount: 0.6, poster: 'heavy', halftoneCell: 9 },
    accent: '#2ae8a0', sky: ['#2a1a5e', '#7a2a8a'], title: ['#d8fff2', '#2ae8a0', '#e82e8a'],
    bg: '#0d0620', band: '#2a1a5e', ink: '#0d0620',
  },
  {
    id: 'warm', name: 'Indoor Warm',
    ramp: RAMP_WARM, grade: 0.9, mapAmount: 0.25, poster: 'luma8',
    heavy: { mapAmount: 0.5, poster: 'heavy', halftoneCell: 8 },
    accent: '#e8c878', sky: ['#f2b25e', '#a87fc0'], title: ['#fff6d8', '#f2b25e', '#c22a3a'],
    bg: '#1c0f2a', band: '#8a4a6e', ink: '#1c0f2a',
  },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

/* Photo options for a hero panel (light grade) and for a small panel
 * (heavy print treatment). ui carries the four sliders. */
export function heroOpts(preset, ui) {
  return {
    grade: preset.grade * (ui.grade ?? 1),
    mapAmount: Math.min(0.3, preset.mapAmount * (ui.grade ?? 1)),
    poster: 'off', halftoneCell: 0,
    grainAmt: Math.min(0.04, ui.grain ?? 0.02),
    rimAmt: ui.rim ?? 0, vigAmt: ui.vig ?? 0.12, skinClampOn: true,
  };
}

export function smallOpts(preset, ui) {
  const h = preset.heavy;
  return {
    grade: preset.grade * (ui.grade ?? 1),
    mapAmount: h.mapAmount, poster: h.poster,
    halftoneCell: (ui.halftone ?? 1) ? h.halftoneCell : 0,
    grainAmt: 0, rimAmt: 0, vigAmt: ui.vig ?? 0.12, skinClampOn: true,
  };
}
