/**
 * Headers of every public collection response, errors included: never indexed, never followed,
 * never stored by a shared cache (a disabled or reset link must stop working at once).
 */
export const PUBLIC_COLLECTION_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
} as const;
