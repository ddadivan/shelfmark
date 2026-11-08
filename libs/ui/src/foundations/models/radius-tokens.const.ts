import type { ScaleToken } from './scale-token.interface';

export const RADIUS_TOKENS: readonly ScaleToken[] = [
  { name: 'radius-sm', value: '6 px · 0.375 rem' },
  { name: 'radius-md', value: '10 px · 0.625 rem' },
  { name: 'radius-lg', value: '14 px · 0.875 rem' },
  { name: 'radius-fab', value: '18 px · 1.125 rem (FAB only)' },
  { name: 'radius-full', value: 'pill' },
];
