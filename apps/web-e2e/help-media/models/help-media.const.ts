/** What the Help center screenshot generator captures and where it writes. */
export const HELP_MEDIA = {
  /** Folder the WebP files are written to (served as `/media/help/`, CSP `img-src 'self'`). */
  outDir: 'apps/web/public/media/help',
  /** Desktop window the app is drawn in. */
  viewport: { width: 1280, height: 800 },
  /** The image is the whole window (16:10) at this scale: 2000 x 1250, as `HELP_MEDIA` in apps/web. */
  scale: 1.5625,
  width: 2000,
  height: 1250,
  /** Each file stays under this size: the encoder lowers the quality until it fits. */
  maxBytes: 130_000,
  /** Best and lowest WebP quality the encoder tries. */
  quality: { best: 80, lowest: 40, step: 6 },
  /** Port of the mock web server (a server already running there is reused). */
  defaultPort: '4220',
} as const;
