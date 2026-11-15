/** What a changelog item is: a feature (title, text, maybe media) or a one-line fix. */
export const CHANGELOG_ITEM_KIND = {
  Feature: 'feature',
  Fix: 'fix',
} as const;
