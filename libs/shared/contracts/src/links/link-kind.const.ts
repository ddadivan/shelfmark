/**
 * What a link points to (ADR 0038): derived at save time from the preview (`og:type`) and the host,
 * recomputed when the URL changes, and changeable by the user. `other` is the fallback.
 */
export const LINK_KIND = {
  Video: 'video',
  Article: 'article',
  Shopping: 'shopping',
  Other: 'other',
} as const;
