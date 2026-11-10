/**
 * The promo video, served from our own domain (`apps/web/public/media`), so the CSP stays as it
 * is (`media-src` falls back to `default-src 'self'`). `null` until the scripted recording (#271)
 * adds the files; the dialog then shows the chapters with a short note instead of the player.
 */
export const HOW_IT_WORKS_VIDEO = {
  Src: null as string | null,
  Poster: null as string | null,
  /** WebVTT captions in English; shown by default because the video starts muted. */
  Captions: null as string | null,
} as const;
