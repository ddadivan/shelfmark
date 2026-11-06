import { BREADCRUMB_ENTRY_KIND } from './models/breadcrumb-entry-kind.const';
import type { BreadcrumbEntry } from './models/breadcrumb-entry.interface';
import type { BreadcrumbItem } from './models/breadcrumb-item.interface';

export interface BreadcrumbTrail {
  readonly entries: readonly BreadcrumbEntry[];
  /** Levels folded into the "…" menu, in order. */
  readonly hidden: readonly BreadcrumbItem[];
}

/**
 * Builds the visible trail. More than `max` levels (the "…" slot counts): the root, "…" and the
 * last `max - 2` levels. On a phone: "…" and only the parent and the current level (the root
 * moves into the menu, so every level stays reachable). The last item is always the current page.
 */
export function breadcrumbTrail(
  items: readonly BreadcrumbItem[],
  maxItems: number,
  phone: boolean,
): BreadcrumbTrail {
  const head = phone ? 0 : 1;
  const tail = phone ? 2 : Math.max(maxItems - 2, 1);
  const collapse = items.length > (phone ? 2 : Math.max(maxItems, 3));
  const lastIndex = items.length - 1;
  const toEntry = (item: BreadcrumbItem, index: number): BreadcrumbEntry => ({
    key: `${index}`,
    kind: index === lastIndex ? BREADCRUMB_ENTRY_KIND.Current : BREADCRUMB_ENTRY_KIND.Link,
    item,
  });
  if (!collapse) {
    return { entries: items.map(toEntry), hidden: [] };
  }
  const tailStart = items.length - tail;
  const entries: BreadcrumbEntry[] = [
    ...items.slice(0, head).map(toEntry),
    { key: 'collapsed', kind: BREADCRUMB_ENTRY_KIND.Collapsed },
    ...items.slice(tailStart).map((item, i) => toEntry(item, tailStart + i)),
  ];
  return { entries, hidden: items.slice(head, tailStart) };
}
