import type { AI_LINE_KIND } from './ai-line-kind.const';

export type AiLineKind = (typeof AI_LINE_KIND)[keyof typeof AI_LINE_KIND];
