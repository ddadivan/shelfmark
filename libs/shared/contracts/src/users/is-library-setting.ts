import { LIBRARY_SORT } from './library-sort.const';
import type { LibrarySort } from './library-sort.type';
import { LIBRARY_VIEW } from './library-view.const';
import type { LibraryView } from './library-view.type';
import { LINK_OPEN_TARGET } from './link-open-target.const';
import type { LinkOpenTarget } from './link-open-target.type';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isLibraryView(value: unknown): value is LibraryView {
  return isOneOf(Object.values(LIBRARY_VIEW), value);
}

export function isLibrarySort(value: unknown): value is LibrarySort {
  return isOneOf(Object.values(LIBRARY_SORT), value);
}

export function isLinkOpenTarget(value: unknown): value is LinkOpenTarget {
  return isOneOf(Object.values(LINK_OPEN_TARGET), value);
}
