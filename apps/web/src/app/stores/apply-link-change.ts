import type { LinkResponse } from '@shelfmark/contracts';
import type { LinkChange } from './models/link-change.interface';
import type { LinkSlot } from './models/link-slot.interface';

/**
 * A list of links that is a copy of what `LinksStore` holds (Today, Reminders, Rediscover) after
 * `change`: a link in its new state replaces the copy, a removed one leaves. Links the list did not
 * hold are not added, except one this list lost to a removal (`slots`): its Undo, or the rollback
 * of a failed delete, puts it back at its old slot. Returns the same array when nothing changed.
 * `LinksStore` stays the only writer; the lists only follow `LinksStore.linkChanges`.
 */
export function applyLinkChange(
  list: readonly LinkResponse[],
  change: LinkChange,
  slots?: Map<string, LinkSlot>,
): readonly LinkResponse[] {
  let next = list;
  for (const id of change.removed ?? []) {
    const index = next.findIndex((link) => link.id === id);
    const link = next[index];
    if (link) {
      slots?.set(id, { link, index });
      next = next.filter((_, at) => at !== index);
    }
  }
  for (const link of change.upserted ?? []) {
    const index = next.findIndex((item) => item.id === link.id);
    if (index >= 0) {
      next = next.map((item, at) => (at === index ? link : item));
      continue;
    }
    const slot = slots?.get(link.id);
    if (slot) {
      slots?.delete(link.id);
      const at = Math.min(slot.index, next.length);
      next = [...next.slice(0, at), link, ...next.slice(at)];
    }
  }
  return next;
}
