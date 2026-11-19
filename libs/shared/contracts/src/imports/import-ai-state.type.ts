import type { IMPORT_AI_STATE } from './import-ai-state.const';

export type ImportAiState = (typeof IMPORT_AI_STATE)[keyof typeof IMPORT_AI_STATE];
