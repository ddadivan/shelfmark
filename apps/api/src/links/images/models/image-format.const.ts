/** Raster formats accepted from remote servers (ADR 0027). SVG is deliberately absent. */
export const IMAGE_FORMAT = {
  Png: 'png',
  Jpeg: 'jpeg',
  Gif: 'gif',
  Webp: 'webp',
  Avif: 'avif',
  Ico: 'ico',
} as const;
