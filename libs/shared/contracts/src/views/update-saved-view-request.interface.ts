import type { SavedViewQueryRequest } from './saved-view-query-request.interface';

/** `PATCH /api/views/:id` body; send only what changes. `query` replaces the whole filter. */
export interface UpdateSavedViewRequest {
  name?: string;
  query?: SavedViewQueryRequest;
}
