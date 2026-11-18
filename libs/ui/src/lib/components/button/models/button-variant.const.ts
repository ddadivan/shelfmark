/** Visual weight of a button. One `primary` per view; `danger` only for irreversible actions. */
export const BUTTON_VARIANT = {
  Primary: 'primary',
  Secondary: 'secondary',
  Ghost: 'ghost',
  Danger: 'danger',
  /** The one AI action ("Fill in with AI"): `ai-fill`, no edge, a 20px spark in `ai`. */
  Ai: 'ai',
} as const;
