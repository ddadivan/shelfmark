/** Visual weight of a button. One `primary` per view; `danger` only for irreversible actions. */
export const BUTTON_VARIANT = {
  Primary: 'primary',
  Secondary: 'secondary',
  Ghost: 'ghost',
  Danger: 'danger',
  /** The one AI action ("Fill in with AI"): `ai-fill`, no edge, a 20px spark in `ai`. */
  Ai: 'ai',
  /** A quiet AI action next to text ("Rewrite"): transparent at rest, the `ai` tints on hover and press. */
  AiGhost: 'ai-ghost',
} as const;
