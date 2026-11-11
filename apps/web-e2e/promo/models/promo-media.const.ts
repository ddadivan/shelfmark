/** Output of the recorder, relative to the workspace root, and the encoder settings. */
export const PROMO_MEDIA = {
  OutDir: 'apps/web/public/media',
  /** File base name: `how-it-works-<theme>-<device>`. */
  Prefix: 'how-it-works',
  /** H.264 quality for the MP4 (higher is smaller); the UI is mostly still, so this stays sharp. */
  H264Crf: '30',
  /** VP9 quality for the WebM (constant quality mode). */
  Vp9Crf: '42',
  /** WebP quality of the poster. */
  PosterQuality: '80',
} as const;
