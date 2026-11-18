import { ASK_LIMIT } from '@shelfmark/contracts';
import type { AskStarter } from '../models/ask-starter.interface';
import { ASK_STARTER_KEYS } from '../models/ask-starter-keys.const';

/** Fallback starter when the user has no folder with links yet. */
export const ASK_STARTER_GENERIC = 'ai.ask.starters.generic';

/**
 * Up to `ASK_LIMIT.StartersMax` starter questions from the user's largest folders (by link count,
 * then name), each with its own template; no server call. No folder with links: one generic
 * question.
 */
export function askStarters(
  folders: readonly { readonly name: string; readonly linkCount: number }[],
): AskStarter[] {
  const largest = folders
    .filter((folder) => folder.linkCount > 0)
    .toSorted((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name))
    .slice(0, Math.min(ASK_LIMIT.StartersMax, ASK_STARTER_KEYS.length));
  if (largest.length === 0) {
    return [{ key: ASK_STARTER_GENERIC, folder: null }];
  }
  return largest.map((folder, index) => ({
    key: ASK_STARTER_KEYS[index] ?? ASK_STARTER_GENERIC,
    folder: folder.name,
  }));
}
