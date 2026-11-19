/**
 * The thinking setting of an Ask profile (ADR 0055 point 1), "no thinking before the first output":
 * Haiku 5.5 takes `disabled` (accepted at effort `high` or below; it rejects `between_tools`),
 * Sonnet 5.5 takes `between_tools` (it rejects `disabled` with a 400). Pinned by
 * `anthropic-ask.provider.spec.ts`.
 */
export const ASK_THINKING = {
  Disabled: 'disabled',
  BetweenTools: 'between_tools',
} as const;
