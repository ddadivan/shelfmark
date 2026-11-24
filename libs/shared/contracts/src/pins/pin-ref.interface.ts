import type { PinKind } from './pin-kind.type';

/** Names a folder, link or saved view in a pin request. */
export interface PinRef {
  kind: PinKind;
  /** UUID of one of the user's live folders or links, or of one of their saved views. */
  id: string;
}
