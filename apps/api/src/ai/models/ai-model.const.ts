/** Models by job (ADR 0047 point 2): named constants, never string literals in services. */
export const AI_MODEL = {
  LinkJob: 'claude-haiku-5-5',
  /** Names the topic clusters of an import (ADR 0056 decision 10): the fast model. */
  ImportGroups: 'claude-haiku-5-5',
  /** Ask chat, quick profile (ADR 0055 point 1): every question starts here. */
  AskQuick: 'claude-haiku-5-5',
  /** Ask chat, deep profile: after the quick model asks for a deeper answer. */
  AskDeep: 'claude-sonnet-5-5',
} as const;

/** Effort by job (`output_config.effort`). */
export const AI_EFFORT = {
  LinkJob: 'low',
  ImportGroups: 'low',
  AskQuick: 'medium',
  AskDeep: 'medium',
} as const;
