import type { PinRef } from './pin-ref.interface';

/** `PUT /api/pins/order` body: every currently pinned item exactly once, in the new order; anything else is a 400. */
export interface ReorderPinsRequest {
  items: PinRef[];
}
