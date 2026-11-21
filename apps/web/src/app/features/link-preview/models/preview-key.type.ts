import type { PREVIEW_KEY } from './preview-key.const';

/** One of `PREVIEW_KEY`. */
export type PreviewKey = (typeof PREVIEW_KEY)[keyof typeof PREVIEW_KEY];
