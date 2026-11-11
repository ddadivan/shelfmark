/**
 * The promo video, recorded by `npx nx run web-e2e:promo` (#271, apps/web-e2e/promo) and served
 * from our own domain (`apps/web/public/media`), so the CSP stays as it is (`media-src` falls
 * back to `default-src 'self'`). There is one recording per theme and device:
 * `<Base>-<light|dark>-<desktop|phone>.<extension>`.
 */
export const HOW_IT_WORKS_VIDEO = {
  Base: '/media/how-it-works',
  /** H.264 MP4 without audio (High profile, level 3.1, as the recorder encodes it). */
  Mp4: 'mp4',
  Mp4Type: 'video/mp4; codecs="avc1.64001F"',
  /** VP9 WebM for browsers without H.264 (some Chromium builds). */
  Webm: 'webm',
  WebmType: 'video/webm; codecs="vp9"',
  Poster: 'webp',
  /** WebVTT captions in English; shown by default because the video starts muted. */
  Captions: 'vtt',
  Desktop: 'desktop',
  Phone: 'phone',
} as const;
