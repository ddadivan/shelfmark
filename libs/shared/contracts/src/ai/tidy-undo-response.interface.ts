import type { LinkResponse } from '../links/link-response.interface';

/** `POST /api/ai/tidy/undo` answer: the links the undo changed, as they are now. */
export interface TidyUndoResponse {
  links: LinkResponse[];
}
