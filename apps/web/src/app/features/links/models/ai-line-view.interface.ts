/** The one AI line of the add-link dialog (`ui-ai-line`): the sentence and its optional button. */
export interface AiLineView {
  readonly text: string;
  /** "Try again" or "AI settings"; empty for no button. */
  readonly actionLabel: string;
}
