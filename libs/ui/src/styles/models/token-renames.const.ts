/**
 * Shelf token name (docs/design-next/shelf/design-system/tokens.json) to the libs/ui custom
 * property that carries it, where the names differ. The libs/ui names are the long-standing API
 * of the library and the app (implementation-plan.md, Token map); every other token keeps its
 * Shelf name (`surface`, `ai-bg`, `radius-md`, `font-size-label`, …). Read by token-sync.spec.ts.
 */
export const TOKEN_RENAMES: Readonly<Record<string, string>> = {
  // Colours
  canvas: 'bg',
  control: 'border-control',
  accent: 'primary',
  'on-accent': 'on-primary',
  focus: 'focus-ring',
  scrim: 'overlay',
  'brand-notch': 'logo-bookmark',
  // Shadows
  highlight: 'shadow-highlight',
  // Spacing: Shelf names the pixels, libs/ui counts 4px steps.
  'space-4': 'space-1',
  'space-8': 'space-2',
  'space-12': 'space-3',
  'space-16': 'space-4',
  'space-24': 'space-6',
  'space-32': 'space-8',
  'space-48': 'space-12',
  'space-64': 'space-16',
};
