import type { PinKind } from './pin-kind.type';

/** Names a folder or link in a pin request. */
export interface PinRef {
  kind: PinKind;
  /** UUID of one of the user's live folders or links. */
  id: string;
}
