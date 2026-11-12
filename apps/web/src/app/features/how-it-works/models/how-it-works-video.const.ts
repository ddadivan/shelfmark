/**
 * The promo video, recorded by `npx nx run web-e2e:promo` (#271, apps/web-e2e/promo) and served
 * from our own domain (`apps/web/public/media`), so the CSP stays as it is (`media-src` falls
 * back to `default-src 'self'`). There are two recordings (#315), one per layout:
 * `<Base>-<desktop|phone>.<extension>`; the dialog plays the one that fits the screen.
 */
export const HOW_IT_WORKS_VIDEO = {
  Base: '/media/how-it-works',
  /** H.264 MP4 without audio (High profile, level 4.0, as the recorder encodes it). */
  Mp4: 'mp4',
  Mp4Type: 'video/mp4; codecs="avc1.640028"',
  /** VP9 WebM for browsers without H.264 (some Chromium builds). */
  Webm: 'webm',
  WebmType: 'video/webm; codecs="vp9"',
  Poster: 'webp',
  /** WebVTT captions in English; shown by default because the video starts muted. */
  Captions: 'vtt',
  Desktop: 'desktop',
  Phone: 'phone',
} as const;
