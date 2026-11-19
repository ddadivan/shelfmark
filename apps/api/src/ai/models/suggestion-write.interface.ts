import type { SuggestionKind } from '@shelfmark/contracts';

/** The fields of a suggestion the apply step writes. */
export interface SuggestionWrite {
  kind: SuggestionKind;
  tagName: string | null;
  folderId: string | null;
  more?: boolean;
  state: string;
}
