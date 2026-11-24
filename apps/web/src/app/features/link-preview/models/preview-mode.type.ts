import type { PREVIEW_MODE } from './preview-mode.const';

/** One of `PREVIEW_MODE`. */
export type PreviewMode = (typeof PREVIEW_MODE)[keyof typeof PREVIEW_MODE];
