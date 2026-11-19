/**
 * A view from a phrase (#535): the phrase length (trimmed, collapsed), the one-line note about what
 * a view cannot express, and how many idea chips the dialog offers.
 */
export const VIEW_DRAFT_LIMIT = {
  PhraseMin: 3,
  PhraseMax: 200,
  NoteMax: 160,
  IdeasMax: 3,
} as const;
