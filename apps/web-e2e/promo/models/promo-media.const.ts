/** Output of the recorder, relative to the workspace root, and the encoder settings. */
export const PROMO_MEDIA = {
  OutDir: 'apps/web/public/media',
  /** File base name: `how-it-works-<desktop|phone>`. */
  Prefix: 'how-it-works',
  /**
   * H.264 quality for the MP4 (higher is smaller); the UI is mostly still, so this stays sharp.
   * 34 keeps the two-minute 1440 x 900 recording near 1.6 MB.
   */
  H264Crf: '34',
  /** VP9 quality for the WebM (constant quality mode). */
  Vp9Crf: '46',
  /** WebP quality of the poster. */
  PosterQuality: '80',
} as const;
