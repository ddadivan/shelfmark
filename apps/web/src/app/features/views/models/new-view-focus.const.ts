/**
 * `autoFocus` selector of the new view dialog: the phrase field while AI is on (the first text
 * field), else the first row, the "Where" select (the first `input` would be a radio of the type
 * row).
 */
export const NEW_VIEW_FOCUS = {
  Phrase: 'input:not([type="hidden"])',
  FirstRow: 'button[role="combobox"]',
} as const;
