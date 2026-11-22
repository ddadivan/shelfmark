import type { TAB_AI_STATUS } from './tab-ai-status.const';

export type TabAiStatus = (typeof TAB_AI_STATUS)[keyof typeof TAB_AI_STATUS];
