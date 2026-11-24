import type { ContrastPair } from './contrast-pair.interface';

const SURFACES = ['bg', 'surface', 'surface-hover', 'surface-pressed'] as const;

/**
 * Token pairs that must keep WCAG AA in the light and the dark theme (token-sync.spec.ts):
 * text and muted text 4.5:1 on the canvas and the three surfaces, the note on its sage tint,
 * status colours on their tints, and 3:1 for control edges and the focus ring on the canvas and
 * the surface.
 *
 * Gaps the author accepted (ADR 0061 point 7) are deliberately not listed: the off switch track
 * (`toggle-off`, about 1.4:1 / 2:1), `text-muted` on `pick` (4.42:1 / 4.49:1) and the
 * empty-state disc edges (`styles.spec.ts` pins those).
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...SURFACES.flatMap((bg) => [
    { fg: 'text', bg, min: 4.5 },
    { fg: 'text-muted', bg, min: 4.5 },
  ]),
  { fg: 'note-text', bg: 'ai-bg', min: 4.5 },
  { fg: 'danger', bg: 'danger-bg', min: 4.5 },
  { fg: 'warning', bg: 'warning-bg', min: 4.5 },
  { fg: 'success', bg: 'success-bg', min: 4.5 },
  ...['bg', 'surface'].flatMap((bg) => [
    { fg: 'border-control', bg, min: 3 },
    { fg: 'focus-ring', bg, min: 3 },
  ]),
];
