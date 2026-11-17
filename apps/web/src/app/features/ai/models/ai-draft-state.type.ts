import type { AI_DRAFT_STATE } from './ai-draft-state.const';

export type AiDraftState = (typeof AI_DRAFT_STATE)[keyof typeof AI_DRAFT_STATE];
