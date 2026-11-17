import type { SuggestionKind } from './suggestion-kind.type';
import type { SuggestionState } from './suggestion-state.type';

/** One AI suggestion for a link: always the user's own tag or folder, or one marked new tag. */
export interface LinkSuggestion {
  id: string;
  kind: SuggestionKind;
  state: SuggestionState;
  /** Set for `tag` and `new-tag`, else `null`. */
  tagName: string | null;
  /** Set for `folder` (one of the user's live folders), else `null`. */
  folderId: string | null;
}
