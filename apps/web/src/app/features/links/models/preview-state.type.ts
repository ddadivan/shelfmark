import type { PREVIEW_STATE } from './preview-state.const';

export type PreviewState = (typeof PREVIEW_STATE)[keyof typeof PREVIEW_STATE];
