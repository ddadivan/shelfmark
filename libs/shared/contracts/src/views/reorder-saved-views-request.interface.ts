/** `PUT /api/views/order` body: the id of every view of the user exactly once, in the new order; anything else is a 400. */
export interface ReorderSavedViewsRequest {
  ids: string[];
}
