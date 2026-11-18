/** Models by job (ADR 0047 point 2): named constants, never string literals in services. */
export const AI_MODEL = {
  LinkJob: 'claude-haiku-5-5',
} as const;

/** Effort by job (`output_config.effort`). */
export const AI_EFFORT = {
  LinkJob: 'low',
} as const;
