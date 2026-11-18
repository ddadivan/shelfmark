/** What the "What's new" screenshot generator (#442) captures and where it writes. */
export const WHATS_NEW_MEDIA = {
  /** The release whose New items are captured; its folder under `apps/web/public/media/whats-new/`. */
  version: '2.2.0',
  /** Desktop window the app is drawn in: 80em, the narrowest side-by-side layout. */
  viewport: { width: 1280, height: 800 },
  /** Size of the crop in CSS pixels (16:10), the image is twice that (retina). */
  crop: { width: 1000, height: 625 },
  scale: 2,
  /** Each file stays near this size: the encoder lowers the quality until it fits. */
  maxBytes: 150_000,
  /** Best and lowest WebP quality the encoder tries. */
  quality: { best: 82, lowest: 40, step: 6 },
  /** Port of the mock web server (a server already running there is reused). */
  defaultPort: '4219',
} as const;
