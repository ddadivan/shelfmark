/**
 * What a link points to (ADR 0038, ten kinds since #537, ADR 0058): derived at save time from the
 * URL, the response type and the page (`og:type`, schema.org JSON-LD), recomputed when the URL
 * changes, and changeable by the user. `other` is the fallback.
 */
export const LINK_KIND = {
  Video: 'video',
  Article: 'article',
  Shopping: 'shopping',
  Podcast: 'podcast',
  Document: 'document',
  Code: 'code',
  App: 'app',
  Post: 'post',
  Recipe: 'recipe',
  Other: 'other',
} as const;
