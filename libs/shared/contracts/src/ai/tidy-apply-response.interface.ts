import type { LinkResponse } from '../links/link-response.interface';
import type { TidyUndoRequest } from './tidy-undo-request.interface';

/** `POST /api/ai/tidy/apply` answer. */
export interface TidyApplyResponse {
  /** The changed links as they are now. */
  links: LinkResponse[];
  /** Links the run changed. */
  applied: number;
  /** Links the run moved into a folder. */
  folders: number;
  /** Tags added over all links. */
  tagsAdded: number;
  /** Selected tags left off because the link would pass `LINK_LIMIT.TagsMax`. */
  skipped: number;
  /** Send back unchanged to `POST /api/ai/tidy/undo` to revert the whole run. */
  undo: TidyUndoRequest;
}
