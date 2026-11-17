import { normalizeTagName } from '@shelfmark/contracts';

/** A tag name as tags compare: normalized and case-insensitive. */
export function tagKey(name: string): string {
  return normalizeTagName(name).toLowerCase();
}
