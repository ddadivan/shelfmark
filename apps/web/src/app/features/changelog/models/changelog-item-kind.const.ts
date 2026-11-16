/**
 * What a changelog item is: a feature (title, text, maybe a screenshot), or an improvement or a
 * fix (one line each).
 */
export const CHANGELOG_ITEM_KIND = {
  Feature: 'feature',
  Improvement: 'improvement',
  Fix: 'fix',
} as const;
