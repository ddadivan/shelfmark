import {
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type LinkSuggestion,
  type SuggestionKind,
} from '@shelfmark/contracts';
import type { SuggestionRowOut } from '../models/suggestion-row-out.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';

const KINDS: readonly string[] = Object.values(SUGGESTION_KIND);

function isSuggestionKind(value: string): value is SuggestionKind {
  return KINDS.includes(value);
}

/** A stored suggestion as the client sees it (only `suggested` and `auto-applied` rows are sent). */
export function toLinkSuggestion(row: SuggestionRowOut): LinkSuggestion {
  return {
    id: row.id,
    kind: isSuggestionKind(row.kind) ? row.kind : SUGGESTION_KIND.Tag,
    state:
      row.state === SUGGESTION_ROW_STATE.AutoApplied
        ? SUGGESTION_STATE.AutoApplied
        : SUGGESTION_STATE.Suggested,
    tagName: row.tagName,
    folderId: row.folderId,
    ...(row.more === true && { more: true }),
  };
}

/**
 * The order a client lists suggestions in: the folder, the primary new tags (what Fill in with AI
 * puts in), the user's own tags, then the "more" ideas. Stable inside each group.
 */
export function orderSuggestions<T extends { kind: string; more?: boolean }>(rows: T[]): T[] {
  const rank = (row: T): number => {
    if (row.kind === SUGGESTION_KIND.Folder) return 0;
    if (row.kind === SUGGESTION_KIND.NewTag) return row.more === true ? 3 : 1;
    return 2;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}
