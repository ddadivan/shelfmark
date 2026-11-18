/**
 * Rediscover thresholds (F8): 3 to 5 items; a candidate was saved at least `SavedDaysMin` days ago
 * and never opened or last opened at least `OpenedDaysMin` days ago; theme mode looks at the links
 * saved in the last `ThemeDays` days and needs at least `ThemeLinksMin` of them.
 */
export const REDISCOVER_LIMIT = {
  ItemsMin: 3,
  ItemsMax: 5,
  SavedDaysMin: 30,
  OpenedDaysMin: 90,
  ThemeDays: 14,
  ThemeLinksMin: 3,
} as const;
