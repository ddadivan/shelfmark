import { THEME } from '@shelfmark/ui';

/** What the user can choose; `System` follows `prefers-color-scheme`. */
export const THEME_PREFERENCE = { System: 'system', Light: THEME.Light, Dark: THEME.Dark } as const;
