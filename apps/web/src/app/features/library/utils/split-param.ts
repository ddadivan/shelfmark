import type { FolderResponse } from '@shelfmark/contracts';
import { APP_PATH } from '../../../models/app-path.const';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LibraryRoute } from '../models/library-route.interface';
import { SPLIT_QUERY_PARAM } from '../models/split-query-param.const';
import { SPLIT_RIGHT_KIND } from '../models/split-right-kind.const';
import type { SplitRight } from '../models/split-right.type';
import type { SplitTarget } from '../models/split-target.type';
import { SPLIT_UNSORTED_TOKEN } from '../models/split-unsorted-token.const';

/** Longer values are never a folder id: they are read as "no valid target". */
const SPLIT_PARAM_MAX_LENGTH = 64;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Reads `?split`: absent is closed; the unsorted token is Unsorted; the shape of a uuid is a
 * folder (not yet checked against the folders); anything else (empty, a repeated parameter, a
 * long or odd value) is the picker.
 */
export function parseSplitParam(raw: unknown): SplitRight {
  if (raw === undefined) {
    return { kind: SPLIT_RIGHT_KIND.Closed };
  }
  if (typeof raw !== 'string' || raw.length > SPLIT_PARAM_MAX_LENGTH) {
    return { kind: SPLIT_RIGHT_KIND.Picker };
  }
  if (raw === SPLIT_UNSORTED_TOKEN) {
    return { kind: SPLIT_RIGHT_KIND.Unsorted };
  }
  return UUID_SHAPE.test(raw)
    ? { kind: SPLIT_RIGHT_KIND.Folder, folderId: raw.toLowerCase() }
    : { kind: SPLIT_RIGHT_KIND.Picker };
}

/**
 * The target of the right half: a folder id, `null` for Unsorted, `undefined` when it shows the
 * picker (closed, no target, an unknown or foreign folder, or the feed the left half shows).
 * A folder is only trusted once the folder list has loaded.
 */
export function resolveSplitTarget(
  right: SplitRight,
  folderMap: Readonly<Record<string, FolderResponse | undefined>>,
  foldersLoaded: boolean,
  leftFilter: LinksFilter,
): SplitTarget {
  switch (right.kind) {
    case SPLIT_RIGHT_KIND.Unsorted:
      return leftFilter.scope === LINKS_SCOPE.Unsorted ? undefined : null;
    case SPLIT_RIGHT_KIND.Folder: {
      const known = foldersLoaded && folderMap[right.folderId] !== undefined;
      const onLeft =
        leftFilter.scope === LINKS_SCOPE.Folder && leftFilter.folderId === right.folderId;
      return known && !onLeft ? right.folderId : undefined;
    }
    default:
      return undefined;
  }
}

/** The `?split` value of a target: the folder id, the unsorted token, or empty for the picker. */
export function splitParamValue(target: SplitTarget): string {
  if (target === undefined) {
    return '';
  }
  return target === null ? SPLIT_UNSORTED_TOKEN : target;
}

/** The folder id (`null` for Unsorted) the left half shows, `undefined` when it shows another list. */
export function leftDropTarget(leftFilter: LinksFilter): SplitTarget {
  switch (leftFilter.scope) {
    case LINKS_SCOPE.Folder:
      return leftFilter.folderId;
    case LINKS_SCOPE.Unsorted:
      return null;
    default:
      return undefined;
  }
}

/** The two halves can trade places when the left one is a folder or Unsorted and the right one shows a target. */
export function canSwap(leftFilter: LinksFilter, target: SplitTarget): boolean {
  return target !== undefined && leftDropTarget(leftFilter) !== undefined;
}

/** The route of a folder (`string`) or Unsorted (`null`). */
export function targetCommands(target: string | null): string[] {
  return target === null ? ['/', APP_PATH.Unsorted] : ['/', APP_PATH.Folders, target];
}

/**
 * Where swapping goes: the page of the right target, with the old left feed as `?split`. `null`
 * when the halves cannot trade places (see `canSwap`).
 */
export function swapCommands(leftFilter: LinksFilter, target: SplitTarget): LibraryRoute | null {
  const left = leftDropTarget(leftFilter);
  if (target === undefined || left === undefined) {
    return null;
  }
  return {
    commands: targetCommands(target),
    queryParams: { [SPLIT_QUERY_PARAM]: splitParamValue(left) },
  };
}
