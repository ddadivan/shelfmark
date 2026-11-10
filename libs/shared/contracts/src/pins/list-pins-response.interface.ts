import type { PinResponse } from './pin-response.interface';

/** `GET /api/pins`, `PUT /api/pins/order`: the pinned items in sidebar order (trashed ones are never listed). */
export interface ListPinsResponse {
  items: PinResponse[];
}
