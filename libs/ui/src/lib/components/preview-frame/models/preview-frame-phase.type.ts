import type { PREVIEW_FRAME_PHASE } from './preview-frame-phase.const';

export type PreviewFramePhase = (typeof PREVIEW_FRAME_PHASE)[keyof typeof PREVIEW_FRAME_PHASE];
