import type { ViewDraftField } from './view-draft-field.type';
import type { SavedViewQuery } from './saved-view-query.interface';

/**
 * The filter AI built from a phrase (#535), already narrowed by `parseViewDraftOutput`: only the
 * user's own folders and tags, at most `SAVED_VIEW_LIMIT.TagsMax` tags; unknown names became search
 * words. Nothing is saved: the dialog fills its rows with it.
 */
export interface ViewDraft {
  /** A complete, valid view query (what `POST /api/views` would accept). */
  query: SavedViewQuery;
  /** The rows AI set (a spark in the dialog until the user changes the row). */
  set: ViewDraftField[];
  /** A suggested name, plain text, 1 to `SAVED_VIEW_LIMIT.NameMax` characters. */
  name: string;
  /** What the filter could not express, one plain-text line in the phrase's language, or `null`. */
  note: string | null;
  /** Names that did not fit (tags past the limit, search words past `LINK_LIMIT.QueryTermsMax`). */
  dropped: string[];
}
