import type { PinKind } from '@shelfmark/contracts';

/** `kind:id`: one string per pinned item. */
export function pinKey(kind: PinKind, id: string): string {
  return `${kind}:${id}`;
}
