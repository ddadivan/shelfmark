import type { SavedViewIcon } from './saved-view-icon.type';
import type { SavedViewQueryRequest } from './saved-view-query-request.interface';

/** `POST /api/views` body: adds the view at the end; 409 beyond `SAVED_VIEW_LIMIT.PerUserMax`. */
export interface CreateSavedViewRequest {
  /** Trimmed, 1 to `SAVED_VIEW_LIMIT.NameMax` characters, no control characters. */
  name: string;
  query: SavedViewQueryRequest;
  /** `SAVED_VIEW_ICON` value; `null` = the default glyph. Absent keeps it (or none on create). */
  icon?: SavedViewIcon | null;
}
