import { FOLDER_LIMIT } from '@shelfmark/contracts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A group name the way a folder name is validated: trimmed, spaces collapsed, 1 to
 * `FOLDER_LIMIT.NameMax` characters, no control characters (and no `<`, since the name is shown
 * back and used in prompts). `null` when it does not qualify.
 */
export function validGroupName(value: unknown): string | null {
  if (typeof value !== 'string' || /\p{Cc}/u.test(value) || value.includes('<')) return null;
  const name = value.replace(/\s+/gu, ' ').trim();
  const length = Array.from(name).length;
  return length >= 1 && length <= FOLDER_LIMIT.NameMax ? name : null;
}

/**
 * Narrows the model's naming answer (never trusted): only keys that were sent, each key once (the
 * first wins), valid names only. A key without a valid name is simply missing from the map; the
 * caller falls back to a name from the group's own words.
 */
export function parseImportGroupNamesOutput(
  output: unknown,
  sentKeys: ReadonlySet<string>,
): Map<string, string> {
  const names = new Map<string, string>();
  if (!isRecord(output) || !Array.isArray(output['groups'])) return names;
  for (const item of output['groups'] as unknown[]) {
    if (!isRecord(item)) continue;
    const { key } = item;
    if (typeof key !== 'string' || !sentKeys.has(key) || names.has(key)) continue;
    const name = validGroupName(item['name']);
    if (name !== null) names.set(key, name);
  }
  return names;
}
