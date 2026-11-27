import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { RECENT_FOLDERS_MAX } from './models/recent-folders-max.const';
import { pushRecent } from '../core/utils/push-recent';

/**
 * Reads the stored list: a JSON array of folder ids, `unsorted` for Unsorted. Anything else
 * (broken JSON, other types, too many entries) is dropped.
 */
export function parseRecentFolders(raw: string | null): (string | null)[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    const ids = parsed
      .filter((item): item is string => typeof item === 'string' && item !== '')
      .map((item) => (item === LINKS_SCOPE.Unsorted ? null : item));
    return [...new Set(ids)].slice(0, RECENT_FOLDERS_MAX);
  } catch {
    return [];
  }
}

/** The text to store for a list (the inverse of `parseRecentFolders`). */
export function serializeRecentFolders(ids: readonly (string | null)[]): string {
  return JSON.stringify(ids.map((id) => id ?? LINKS_SCOPE.Unsorted));
}

/** `target` moves to the front of the list, which keeps at most `RECENT_FOLDERS_MAX`. */
export function pushRecentFolder(
  ids: readonly (string | null)[],
  target: string | null,
): (string | null)[] {
  return pushRecent(ids, target, RECENT_FOLDERS_MAX);
}
