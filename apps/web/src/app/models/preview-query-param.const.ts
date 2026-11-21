/**
 * The query parameter of the link preview (#553): `?preview=<linkId>` on a library page keeps the
 * preview open across reloads and Back. Opening or switching it never resets the feed's scroll.
 */
export const PREVIEW_QUERY_PARAM = 'preview' as const;
