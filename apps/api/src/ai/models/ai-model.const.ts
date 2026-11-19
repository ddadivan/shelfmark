/** Models by job (ADR 0047 point 2): named constants, never string literals in services. */
export const AI_MODEL = {
  LinkJob: 'claude-haiku-5-5',
  /** Ask your shelf answers (ADR 0052): Sonnet, streamed, no tools; replaced by the chat profiles. */
  Ask: 'claude-sonnet-5-5',
  /** Ask chat, quick profile (ADR 0055 point 1): every question starts here. */
  AskQuick: 'claude-haiku-5-5',
  /** Ask chat, deep profile: after the quick model asks for a deeper answer. */
  AskDeep: 'claude-sonnet-5-5',
} as const;

/** Effort by job (`output_config.effort`). */
export const AI_EFFORT = {
  LinkJob: 'low',
  Ask: 'medium',
  AskQuick: 'medium',
  AskDeep: 'medium',
} as const;
