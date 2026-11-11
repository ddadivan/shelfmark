import type { PinRef } from './pin-ref.interface';

/** `POST /api/pins` body: pins the item at the end (idempotent) and answers `ListPinsResponse`. 404 for a foreign, missing or trashed target, 409 beyond `PIN_LIMIT.Max`. */
export type CreatePinRequest = PinRef;
