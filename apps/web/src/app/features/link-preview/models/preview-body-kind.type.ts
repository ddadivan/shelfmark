import type { PREVIEW_BODY_KIND } from './preview-body-kind.const';

/** One of `PREVIEW_BODY_KIND`. */
export type PreviewBodyKind = (typeof PREVIEW_BODY_KIND)[keyof typeof PREVIEW_BODY_KIND];
