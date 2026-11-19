import type { LinkKind } from '@shelfmark/contracts';
import type { AskMatch } from './ask-match.type';

/**
 * A link of the session user as an Ask tool shows it to the model (ADR 0055 point 3, the allow-list
 * of `toAskToolLink`): a per-question ref instead of the id, never full URLs with queries, images,
 * reminders or share tokens.
 */
export interface AskToolLink {
  ref: number;
  title: string;
  /** Host without `www.` and the path, no query or fragment. */
  site: string;
  /** Folder path, `null` for Unsorted. */
  folder: string | null;
  tags: string[];
  kind: LinkKind;
  favorite: boolean;
  /** UTC day it was saved, `YYYY-MM-DD`. */
  savedOn: string;
  summary: string | null;
  /** How a search found it. */
  match?: AskMatch;
  /** `get_link` only: the user's note, only with "Include my notes". */
  note?: string | null;
  /** `get_link` only: UTC day it was last opened. */
  lastOpenedOn?: string | null;
}
