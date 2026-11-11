import type { SavedViewResponse } from './saved-view-response.interface';

/** `GET /api/views`, `PUT /api/views/order`: the user's views in order, counted in one grouped query. */
export interface ListSavedViewsResponse {
  items: SavedViewResponse[];
  /** All live links of the user: the count of the fixed "All" chip, which is not a stored view. */
  total: number;
}
