/** Visual weight of a button. One `primary` per view; `danger` only for irreversible actions. */
export const BUTTON_VARIANT = {
  Primary: 'primary',
  Secondary: 'secondary',
  Ghost: 'ghost',
  Danger: 'danger',
  /** A 28px round frosted button over a preview (play, star, "..."); icon only, always with the overlay hit area. */
  Glass: 'glass',
  /** The one AI action ("Fill in with AI"): `ai-fill`, no edge, a spark in `ai`. */
  Ai: 'ai',
  /** A quiet AI action next to text ("Rewrite"): transparent at rest, the `ai` tints on hover and press. */
  AiGhost: 'ai-ghost',
} as const;
