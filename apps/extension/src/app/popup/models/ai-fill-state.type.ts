import type { AI_FILL_STATE } from './ai-fill-state.const';

export type AiFillState = (typeof AI_FILL_STATE)[keyof typeof AI_FILL_STATE];
