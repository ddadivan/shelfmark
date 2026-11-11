/**
 * The account theme (`/api/me/settings`): `system` follows `prefers-color-scheme`, `light` and
 * `dark` are the fixed themes, `custom` is the person's `CustomTheme` on a light or dark base.
 */
export const THEME_PREFERENCE = {
  System: 'system',
  Light: 'light',
  Dark: 'dark',
  Custom: 'custom',
} as const;
