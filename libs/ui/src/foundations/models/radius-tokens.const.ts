import type { ScaleToken } from './scale-token.interface';

export const RADIUS_TOKENS: readonly ScaleToken[] = [
  { name: 'radius-sm', value: '8 px · 0.5 rem (keys, tiny parts)' },
  { name: 'radius-md', value: '14 px · 0.875 rem (inputs, rows)' },
  { name: 'radius-lg', value: '22 px · 1.375 rem (cards, panels, sidebar)' },
  { name: 'radius-xl', value: '28 px · 1.75 rem (dialogs, sheets)' },
  { name: 'radius-fab', value: '18 px · 1.125 rem (FAB only)' },
  { name: 'radius-full', value: 'pill' },
];
