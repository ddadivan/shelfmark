import type { ColorGroup } from './color-group.interface';

/** Colour tokens from docs/design/tokens.json (2027 Refresh), grouped by role. Names match the CSS variables. */
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
  { title: 'Search highlight', tokens: ['highlight-bg', 'highlight-text'] },
  { title: 'Glass', tokens: ['glass', 'glass-line'] },
  {
    title: 'Folder colours',
    tokens: [
      'folder-graphite',
      'folder-graphite-bg',
      'folder-sage',
      'folder-sage-bg',
      'folder-ocean',
      'folder-ocean-bg',
      'folder-plum',
      'folder-plum-bg',
      'folder-clay',
      'folder-clay-bg',
      'folder-amber',
      'folder-amber-bg',
      'folder-rose',
      'folder-rose-bg',
      'folder-teal',
      'folder-teal-bg',
    ],
  },
  { title: 'Other', tokens: ['overlay', 'logo-bookmark'] },
  {
    title: 'Cards and skeletons',
    tokens: ['card-hover-bg', 'card-hover-border', 'skeleton-shimmer'],
  },
];
