import type { AI_PART } from './ai-part.const';

export type AiPart = (typeof AI_PART)[keyof typeof AI_PART];
