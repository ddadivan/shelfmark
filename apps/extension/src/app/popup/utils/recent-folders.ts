import { RECENT_FOLDERS_KEY } from '../models/recent-folders-key.const';
import { RECENT_FOLDERS_MAX } from '../models/recent-folders-max.const';

/** Folder ids saved to most recently from this extension, newest first; `null` is Unsorted. */
export function readRecentFolders(): (string | null)[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string | null => id === null || typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Puts a folder first in the recent list (storage failures are ignored: it is only a convenience). */
export function rememberRecentFolder(id: string | null): void {
  const next = [id, ...readRecentFolders().filter((other) => other !== id)].slice(
    0,
    RECENT_FOLDERS_MAX,
  );
  try {
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage: the chips simply stay as they were.
  }
}
