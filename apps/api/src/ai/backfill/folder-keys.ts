function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The folder keys a backfill job offered the model, stored as ids only in `ai_jobs.result` while its
 * batch runs (the user's folders may change before the results arrive).
 */
export function toFolderKeysJson(map: ReadonlyMap<string, string>): {
  folderKeys: Record<string, string>;
} {
  return { folderKeys: Object.fromEntries(map) };
}

/** Reads them back; anything else is an empty map (no folder can then be suggested). */
export function readFolderKeys(value: unknown): Map<string, string> {
  const keys = isRecord(value) ? value['folderKeys'] : undefined;
  if (!isRecord(keys)) return new Map();
  return new Map(
    Object.entries(keys).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}
