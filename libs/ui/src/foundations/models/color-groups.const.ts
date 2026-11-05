import type { ColorGroup } from './color-group.interface';

/** Colour tokens from docs/design/tokens.css, grouped by role. Names match the CSS variables. */
export const COLOR_GROUPS: readonly ColorGroup[] = [
  {
    title: 'Surfaces and borders',
    tokens: ['bg', 'surface', 'surface-hover', 'surface-pressed', 'border', 'border-control'],
  },
  {
    title: 'Text and primary',
    tokens: ['text', 'text-muted', 'primary', 'primary-hover', 'on-primary'],
  },
  { title: 'Accent and focus', tokens: ['accent', 'accent-bg', 'accent-text', 'focus-ring'] },
  { title: 'Status', tokens: ['danger', 'danger-bg', 'success', 'warning', 'warning-bg'] },
  { title: 'Other', tokens: ['overlay', 'logo-bookmark'] },
];
