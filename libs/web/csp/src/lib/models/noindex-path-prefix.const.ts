/**
 * HTML documents under this prefix are public collections (`/c/:token`, #276, ADR 0040): they are
 * answered with `X-Robots-Tag: noindex, nofollow` so search engines never index a shared link.
 */
export const NOINDEX_PATH_PREFIX = '/c/';
