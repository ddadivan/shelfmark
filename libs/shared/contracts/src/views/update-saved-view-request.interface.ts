import type { SavedViewIcon } from './saved-view-icon.type';
import type { SavedViewQueryRequest } from './saved-view-query-request.interface';

/** `PATCH /api/views/:id` body; send only what changes. `query` replaces the whole filter. */
export interface UpdateSavedViewRequest {
  name?: string;
  query?: SavedViewQueryRequest;
  /** `SAVED_VIEW_ICON` value; `null` = the default glyph. Absent keeps it (or none on create). */
  icon?: SavedViewIcon | null;
}
