import type { TidySuggestionRow } from './tidy-suggestion-row.interface';

/** A live link of the user with its tag names and `suggested` rows, as Tidy reads it. */
export interface TidyLinkRow {
  id: string;
  url: string;
  folderId: string | null;
  tags: readonly { tag: { name: string } }[];
  suggestions: readonly TidySuggestionRow[];
}
